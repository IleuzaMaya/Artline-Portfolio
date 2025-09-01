/**
 * Calcula orçamento de emoldurados com regras de:
 * - Molduras em camadas (perímetro externo por camada + perda de chanfro)
 * - Moldura Caixa: reforço por tabela; fallback percentual
 * - Passepartout: checagem de folha (102 × 152) com rotação e margem
 * - Baguete interna: perímetro interno com perda técnica
 * - Entre Vidros: adiciona vidro comum no fundo
 * - Aberturas extras no Passe-partout (preço fixo por abertura adicional)
 * - Camisa/Objeto: adicional (m² ou fixo) a partir de tabela
 * - Chassi para Tela
 * - Markup e quantidade
 */

export async function calcularOrcamento({
  altura,
  largura,
  quantidade = 1,
  markup = 30,
  margemPassepartout = 0,

  // molduras
  moldura1,
  moldura2,
  moldura3,

  // planos
  vidroSelecionado,
  fundoSelecionado,
  passepartoutSelecionado,
  impressaoSelecionada,

  // outros selecionados
  tipoSelecionado,
  bagueteInternaSelecionada,

  // extras do form
  fundoExtraSelecionado,
  camisaObjetoTabela = [],
  // 👇 compat: o front pode mandar `camisaObjetoExtra`; se não vier, usamos a tabela
  camisaObjetoExtra = null,
  diversosSelecionados = [],

  // perfil / comportamentos
  entreVidros = false,
  forcarCamisaObjetoTipo = null, // 'camisa' | 'objeto' | null
  camisaEntreVidros = false,
  precoVidroComumM2 = null,
  vidroSomenteComum = false,
  foamExtraAuto = false,
  bagueteAuto = false,

  // passe-partout
  numAberturas = 1,
  precoAberturaExtra = 0,

  // chassis
  incluirChassi = false,
  chassiSelecionado = null,

  // reforço (tabela vinda do back/edge)
  reforcoTabela = [],
}) {
  // ---------------- helpers base ----------------
  const num = (v, d = 0) => {
    if (v === null || v === undefined) return d;
    const s = String(v).replace(/[^\d,.\-]/g, "");
    const semMilhar = s.replace(/\.(?=\d{3}(?:\D|$))/g, "");
    const norm = semMilhar.replace(",", ".");
    const n = Number(norm);
    return Number.isFinite(n) ? n : d;
  };
  const pickNum = (o, keys, d = 0) => {
    for (const k of keys) {
      if (o && o[k] != null) {
        const n = num(o[k], NaN);
        if (Number.isFinite(n)) return n;
      }
    }
    return d;
  };
  // compat com chamadas antigas
  const pick = (o, ks = []) => pickNum(o, ks, 0);

  const toM2 = (wCm, hCm) => (wCm / 100) * (hCm / 100);
  const perimetroM = (wCm, hCm) => (2 * (wCm + hCm)) / 100;

  // preço por metro da moldura: tenta vários aliases e até extrai de string
  const precoMetroMoldura = (m = {}) => {
    const direto = pickNum(m, [
      "preco_ml", "valor_ml",
      "preco_metro", "valor_metro",
      "preco_por_metro", "valor_por_metro",
      "preco_por_ml", "valor_por_ml",
      "preco_m", "valor_m",
      "preco", "valor",
    ], 0);
    if (direto > 0) return direto;

    for (const k of Object.keys(m || {})) {
      const v = m[k];
      if (typeof v === "string" && /pre[cç]o|valor|€/i.test(k + v)) {
        const s = v
          .replace(/[^\d,.\-]/g, "")
          .replace(/\.(?=\d{3}(?:\D|$))/g, "")
          .replace(",", ".");
        const n = Number(s);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
    return 0;
  };

  // largura “face” da moldura (cm)
  const larguraFaceCm = (m) => {
    const mm = num(m?.largura_mm);
    if (mm > 0) return mm / 10;
    const cm = num(m?.largura);
    return Number.isFinite(cm) ? cm : 0;
  };

  // ---------------- normalização inicial ----------------
  const ALT = num(altura);
  const LAR = num(largura);
  if (!ALT || !LAR) return null;

  const QTD = Math.max(1, num(quantidade, 1));
  const MARKUP = Math.max(0, num(markup, 0)) / 100;
  const MARGEM = Math.max(0, num(margemPassepartout, 0));
  const ABERTURAS = Math.max(1, num(numAberturas, 1));
  const PRECO_ABERTURA_EXTRA = Math.max(0, num(precoAberturaExtra, 0));

  const larguraInterna = LAR + 2 * MARGEM;
  const alturaInterna  = ALT + 2 * MARGEM;

  const areaObraM2     = toM2(LAR, ALT);
  const areaPlanosM2   = toM2(larguraInterna, alturaInterna);
  const perimetroObraM = perimetroM(LAR, ALT);
  const perimetroInternoM  = perimetroM(larguraInterna, alturaInterna);
  const perimetroAberturaM = perimetroM(LAR, ALT);

  // ---------------- Diversos unitários ----------------
  let custoDiversosUnit = 0;
  const itensDiversos = [];
  (Array.isArray(diversosSelecionados) ? diversosSelecionados : []).forEach((dv) => {
    const preco = num(pick(dv, ["preco","valor","preco_unit","valor_unit"]), 0);
    if (preco <= 0) return;
    const faixa = String(dv.faixa_aplicacao || dv.faixa || "").toLowerCase();
    const maiorLadoCm = Math.max(ALT, LAR);
    const okFaixa =
      !faixa ||
      (faixa.includes("até")   && maiorLadoCm <= 50) ||
      (faixa.includes("acima") && maiorLadoCm > 50);
    if (!okFaixa) return;
    custoDiversosUnit += preco;
    itensDiversos.push({
      id: dv.id,
      nome: dv.nome || "Serviço",
      faixa: dv.faixa_aplicacao || null,
      valor: preco,
    });
  });
  const diversosInfo = { itens: itensDiversos, valorTotal: custoDiversosUnit };

  // ---------------- preços por plano ----------------
  const precoVidroSelM2   = pickNum(vidroSelecionado || {}, ["preco_m2","valor_m2","preco","valor"], 0);
  const precoFundoM2      = pickNum(fundoSelecionado || {}, ["preco_m2","valor_m2","preco","valor"], 0);
  const precoFundoExtraM2 = pickNum(fundoExtraSelecionado || {}, ["preco_m2","valor_m2","preco","valor"], 0);
  const precoImpM2        = pickNum(impressaoSelecionada || {}, ["preco_m2","valor_m2","preco","valor"], 0);

  const precoVidroComum = num(precoVidroComumM2, precoVidroSelM2);
  const precoVidroFrontalM2 = vidroSomenteComum ? precoVidroComum : precoVidroSelM2;

  // ---------------- Passe-partout (folha e custo) ----------------
  const FOLHA_PP = { menor: 102, maior: 152, seguranca: 2 };
  const temPP = Boolean(passepartoutSelecionado) || MARGEM > 0;

  let excedePassepartout = false, mensagemAviso = null;
  if (temPP) {
    const W = larguraInterna, H = alturaInterna;
    const maxMenor = FOLHA_PP.menor - FOLHA_PP.seguranca;
    const maxMaior = FOLHA_PP.maior - FOLHA_PP.seguranca;
    const ok = (W <= maxMenor && H <= maxMaior) || (H <= maxMenor && W <= maxMaior);
    excedePassepartout = !ok;
    if (excedePassepartout) {
      mensagemAviso = "Dimensões excedem a folha de passepartout (102 × 152 cm). Passepartout desativado automaticamente.";
    }
  }

  let custoPP = 0;
  let modoCobrancaPassepartout = null;
  if (temPP && !excedePassepartout) {
    const precoPP_ML = pickNum(passepartoutSelecionado || {}, ["preco_ml","valor_ml"], 0);
    const precoPP_M2 = pickNum(passepartoutSelecionado || {}, ["preco_m2","valor_m2","preco","valor"], 0);
    if (precoPP_ML > 0) {
      custoPP = perimetroAberturaM * precoPP_ML;
      modoCobrancaPassepartout = "ml";
    } else if (precoPP_M2 > 0) {
      custoPP = areaPlanosM2 * precoPP_M2;
      modoCobrancaPassepartout = "m2";
    } else {
      modoCobrancaPassepartout = "indefinido";
    }
  }

  const aberturasExtras = Math.max(0, ABERTURAS - 1);
  const custoAberturasExtras = (temPP && !excedePassepartout)
    ? aberturasExtras * PRECO_ABERTURA_EXTRA
    : 0;

  // ---------------- Molduras em camadas ----------------
  const camadas = [moldura1, moldura2, moldura3].filter(Boolean);
  const coefPerdaChanfroPorCanto = 1; // cm -> m

  let larguraExterna = larguraInterna;
  let alturaExterna  = alturaInterna;
  let custosCamadas = [];
  let custoMoldurasTotal = 0;

  camadas.forEach((m, idx) => {
    const wFace = larguraFaceCm(m);
    const precoML = precoMetroMoldura(m); // 👈 agora robusto
    larguraExterna += 2 * wFace;
    alturaExterna  += 2 * wFace;

    const pCamadaM = perimetroM(larguraExterna, alturaExterna);
    const perdaChanfroM = (coefPerdaChanfroPorCanto * wFace * 4) / 100;
    const custo = (pCamadaM + perdaChanfroM) * precoML;

    custosCamadas.push({
      idx: idx + 1,
      larguraFaceCm: wFace,
      perimetroM: pCamadaM,
      perdaChanfroM,
      precoML,
      custo,
    });
    custoMoldurasTotal += custo;
  });

  // ---------------- Vidros / Fundo / Impressão ----------------
  const custoVidroFrontal = areaPlanosM2 * precoVidroFrontalM2;
  let custoVidroFundoComum = 0;
  if (entreVidros || camisaEntreVidros) {
    const precoBaseComum = precoVidroComum;
    custoVidroFundoComum = areaPlanosM2 * precoBaseComum;
  }
  const custoVidro = custoVidroFrontal + custoVidroFundoComum;

  const custoFundo      = areaPlanosM2 * precoFundoM2;
  const custoFundoExtra = areaPlanosM2 * precoFundoExtraM2;
  const custoImpressao  = areaObraM2   * precoImpM2;

  // ---------------- Baguete interna ----------------
  const precoBagueteML =
    pickNum(bagueteInternaSelecionada || {}, ["preco_metro","preco_ml","valor_ml"], 0) ||
    pickNum(tipoSelecionado || {}, ["preco_metro_baguete","preco_baguete_ml","preco_baguete"], 0);

  const isCaixa =
    (moldura1?.uso_tipo === "C") ||
    /caixa/i.test(String(moldura1?.tipo || moldura1?.categoria || ""));

  const usaBaguete = isCaixa || Boolean(num(tipoSelecionado?.usa_baguete || 0));
  const custoBagueteInterna =
    usaBaguete && num(precoBagueteML, 0) > 0 ? perimetroInternoM * num(precoBagueteML, 0) : 0;

  // ---------------- Chassi (Tela) ----------------
  let chassiInfo = null;
  let custoChassi = 0;
  if (incluirChassi && chassiSelecionado) {
    const precoMLChassi = pickNum(chassiSelecionado, ["preco_ml","preco","valor_ml","valor"], 0);
    if (precoMLChassi > 0) {
      custoChassi = precoMLChassi * perimetroObraM;
      const esp = /5mm/i.test(chassiSelecionado.nome || "") ? "5 mm"
               : (/3mm/i.test(chassiSelecionado.nome || "") ? "3 mm" : "");
      chassiInfo = {
        nome: chassiSelecionado.nome || "Chassi",
        espessura: esp,
        mm: esp,
        precoML: precoMLChassi,
        ml: perimetroObraM,
      };
    }
  }

  // ---------------- Reforço (tabela + fallback) ----------------
  const regraReforco = {
    habilitado: true,
    limiteMaiorLadoCm: 70,
    limitePerimetroCm: 240,
    valor: 0.08,
    minimoAbsoluto: 25,
  };

  const maiorLadoInterno = Math.max(larguraInterna, alturaInterna);
  const perimetroInternoCm = perimetroInternoM * 100;

  let aplicaReforco = false;
  let valorReforco = 0;
  let reforcoInfo = { necessita_reforco: false, nome: null, valorTotal: 0 };

  if (isCaixa && Array.isArray(reforcoTabela) && reforcoTabela.length) {
    const W = larguraInterna;
    const H = alturaInterna;

    const _pickN = (r, keys) => pickNum(r, keys, 0);

    const match = reforcoTabela.find((r) => {
      const wMin = _pickN(r, ["largura_min_cm","w_min","min_largura"]);
      const wMax = _pickN(r, ["largura_max_cm","w_max","max_largura"]) || Infinity;
      const hMin = _pickN(r, ["altura_min_cm","h_min","min_altura"]);
      const hMax = _pickN(r, ["altura_max_cm","h_max","max_altura"]) || Infinity;
      return (W >= wMin && W <= wMax && H >= hMin && H <= hMax) ||
             (H >= wMin && H <= wMax && W >= hMin && W <= hMax);
    });

    if (match) {
      valorReforco = _pickN(match, ["metragem_linear_reforco","preco_total","valor","custo_total"]);
      if (valorReforco > 0) {
        aplicaReforco = true;
        reforcoInfo = {
          necessita_reforco: true,
          nome: match.observacoes || "Reforço estrutural",
          valorTotal: valorReforco,
        };
      }
    }
  }

  if (isCaixa && !aplicaReforco && regraReforco.habilitado) {
    if (maiorLadoInterno >= regraReforco.limiteMaiorLadoCm ||
        perimetroInternoCm >= regraReforco.limitePerimetroCm) {
      aplicaReforco = true;
      const base = custosCamadas[0]?.custo ?? custoMoldurasTotal;
      valorReforco = Math.max(regraReforco.minimoAbsoluto, base * regraReforco.valor);
      reforcoInfo = {
        necessita_reforco: true,
        nome: "Reforço estrutural (moldura caixa)",
        valorTotal: valorReforco,
      };
    }
  }

  // ---------------- Camisa / Objeto (adicional) ----------------
  const tabelaCamisa = Array.isArray(camisaObjetoExtra) && camisaObjetoExtra.length
    ? camisaObjetoExtra
    : (Array.isArray(camisaObjetoTabela) ? camisaObjetoTabela : []);

  const estaEmTipoCamisaOuObjeto = /(camisa|objeto)/i.test(String(tipoSelecionado?.nome || ""));
  const aplicarCamisa = Boolean(forcarCamisaObjetoTipo || estaEmTipoCamisaOuObjeto);

  let valorCamisaObjeto = 0;
  let camisaObjetoInfo = { aplicado: false, modo: null, faixa: null, valor: 0 };

  if (aplicarCamisa && tabelaCamisa.length) {
    // regra simples: se existir preco_m2/valor_m2 usa m²; senão, usa preco/valor fixo do 1º ativo
    const linha = tabelaCamisa.find((r) => {
      const ativo = (r?.ativo === true || r?.ativo === 1 || r?.ativo === "1" || r?.ativo === "true");
      const hasPreco = pickNum(r, ["preco_m2","valor_m2","preco","valor"], 0) > 0;
      return (ativo || r?.ativo == null) && hasPreco;
    }) || tabelaCamisa[0];

    const precoM2 = pickNum(linha || {}, ["preco_m2","valor_m2"], 0);
    if (precoM2 > 0) {
      valorCamisaObjeto = precoM2 * areaObraM2;
      camisaObjetoInfo = { aplicado: true, modo: "m2", faixa: null, valor: valorCamisaObjeto };
    } else {
      const fixo = pickNum(linha || {}, ["preco","valor"], 0);
      if (fixo > 0) {
        valorCamisaObjeto = fixo;
        camisaObjetoInfo = { aplicado: true, modo: "fixo", faixa: null, valor: valorCamisaObjeto };
      }
    }
  }

  // ---------------- Subtotais / Totais ----------------
  const subtotalMateriaisUnit =
    custoMoldurasTotal +
    custoBagueteInterna +
    custoVidro +
    custoFundo +
    custoFundoExtra +
    custoPP +
    custoAberturasExtras +
    custoImpressao +
    valorCamisaObjeto +             // 👈 agora definido sempre
    (aplicaReforco ? valorReforco : 0) +
    custoChassi +
    custoDiversosUnit;

  const valorSemMarkup = subtotalMateriaisUnit * QTD;
  const totalUnitario  = subtotalMateriaisUnit * (1 + MARKUP);
  const valorComMarkup = totalUnitario * QTD;

  // medidas finais EXTERNAS (após camadas)
  const larguraFinal = larguraExterna;
  const alturaFinal  = alturaExterna;

  // risco (informativo)
  const espessuraMolduraMm = num(moldura1?.espessura_mm || 18);
  const riscoMolduraFina = (Math.max(larguraInterna, alturaInterna) >= 80 && espessuraMolduraMm < 15);

  return {
    valorSemMarkup,
    valorTotal: valorComMarkup,

    excedePassepartout,
    reforcoInfo,
    mensagemAviso,
    modoCobrancaPassepartout,
    chassiInfo,

    larguraReforco: larguraInterna,
    alturaReforco:  alturaInterna,
    larguraFinal,
    alturaFinal,
    areaTotalM2: areaPlanosM2,

    riscoMolduraFina,

    diversosInfo,
    camisaObjetoInfo, // 👈 usado pelo front para descrever

    numAberturasConsideradas: ABERTURAS,

    custos: {
      moldurasCamadas: custosCamadas,
      moldurasTotal: custoMoldurasTotal,

      bagueteInterna: custoBagueteInterna,

      vidroFrontal: custoVidroFrontal,
      vidroFundoComum: custoVidroFundoComum,
      vidro: custoVidro,

      fundo: custoFundo,
      fundoExtra: custoFundoExtra,

      passepartout: custoPP,
      passepartoutAberturasExtra: custoAberturasExtras,

      impressao: custoImpressao,

      diversos: custoDiversosUnit,
      camisaObjeto: valorCamisaObjeto,

      chassi: custoChassi,
      reforco: valorReforco,

      subtotalMateriaisUnit,
      totalUnitario,
      quantidade: QTD,
      markupPercent: MARKUP * 100,

      perimetroInternoM,
      perimetroAberturaM,
    },
  };
}
