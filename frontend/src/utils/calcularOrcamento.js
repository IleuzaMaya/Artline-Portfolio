/**
 * Calcula orçamento de emoldurados com regras de:
 * - Moldura Caixa: reforço por tabela (qualquer camada); fallback percentual
 * - Passepartout: checagem de folha (102 × 152) com rotação e margem
 * - Baguete interna: perímetro com perda técnica
 * - Entre Vidros: adiciona vidro comum no fundo
 * - Aberturas extras no Passe-partout (preço fixo por abertura adicional)
 * - Markup e quantidade
 */
export async function calcularOrcamento({
  altura,
  largura,
  quantidade = 1,
  markup = 30,
  margemPassepartout = 0,
  moldura1,
  moldura2,
  moldura3,
  vidroSelecionado,
  fundoSelecionado,
  passepartoutSelecionado,
  impressaoSelecionada,
  tipoSelecionado,
  bagueteInternaSelecionada,

  // extras do form
  fundoExtraSelecionado,
  camisaObjetoTabela = [],
  camisaObjetoExtra = 0, // compat: se o front não mandar, fica 0
  diversosSelecionados = [],

  // perfil / comportamentos
  entreVidros = false,
  forcarCamisaObjetoTipo = false,
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
  // ---------- helpers numéricos ----------
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
  const toM2 = (wCm, hCm) => (wCm / 100) * (hCm / 100);
  const perimetroM = (wCm, hCm) => (2 * (wCm + hCm)) / 100;

  // ---------- coerções iniciais ----------
  const ALT = num(altura);
  const LAR = num(largura);
  const QTD = Math.max(1, num(quantidade, 1));
  const MARKUP = Math.max(0, num(markup, 0)) / 100;
  const MARGEM = Math.max(0, num(margemPassepartout, 0));
  const ABERTURAS = Math.max(1, num(numAberturas, 1));
  const PRECO_ABERTURA_EXTRA = Math.max(0, num(precoAberturaExtra, 0));

  if (!ALT || !LAR) return null;

  // base interna (obra + margem PP)
  const larguraInterna = LAR + 2 * MARGEM;
  const alturaInterna  = ALT + 2 * MARGEM;

  const areaObraM2   = toM2(LAR, ALT);
  const areaPlanosM2 = toM2(larguraInterna, alturaInterna);
  const perimetroInternoM  = perimetroM(larguraInterna, alturaInterna);
  const perimetroAberturaM = perimetroM(LAR, ALT);
  const perimetroObraM = perimetroM(LAR, ALT);
  const MAIOR_LADO_CM = Math.max(ALT, LAR);

  // preços planos
  const precoVidroSelM2   = pickNum(vidroSelecionado || {}, ['preco_m2','valor_m2','preco','valor'], 0);
  const precoFundoM2      = pickNum(fundoSelecionado || {}, ['preco_m2','valor_m2','preco','valor'], 0);
  const precoFundoExtraM2 = pickNum(fundoExtraSelecionado || {}, ['preco_m2','valor_m2','preco','valor'], 0);
  const precoImpM2        = pickNum(impressaoSelecionada || {}, ['preco_m2','valor_m2','preco','valor'], 0);

  // vidro comum (fallback)
  const precoVidroComum = num(precoVidroComumM2, precoVidroSelM2);
  const precoVidroFrontalM2 = vidroSomenteComum ? precoVidroComum : precoVidroSelM2;

  // Passe-partout: ML preferencial; fallback m²
  const precoPP_ML = pickNum(passepartoutSelecionado || {}, ['preco_ml','valor_ml'], 0);
  const precoPP_M2 = pickNum(passepartoutSelecionado || {}, ['preco_m2','valor_m2','preco','valor'], 0);

  // Baguete interna (ml)
  const precoBagueteML =
    num(
      pickNum(bagueteInternaSelecionada || {}, ['preco_metro','preco_ml','valor_ml'], 0),
      pickNum(tipoSelecionado || {}, ['preco_metro_baguete','preco_baguete_ml','preco_baguete'], 0)
    );

  // Molduras helpers
  const larguraFaceCm = (m) => {
    const mm = num(m?.largura_mm);
    return mm > 0 ? mm / 10 : num(m?.largura, 0);
  };
  const precoMetroMoldura = (m) =>
    pickNum(m || {}, ['preco_por_metro','preco_metro','valor_metro','preco'], 0);
  const tipoTexto = (m) => (m?.tipo || m?.tipo_moldura || m?.categoria || '').toLowerCase();
  const isCaixa = (m) => !!m && (m?.uso_tipo === 'C' || /caixa/.test(tipoTexto(m)));

  // Checagem da folha de PP
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
      mensagemAviso = 'Dimensões excedem a folha de passepartout (102 × 152 cm). Passepartout desativado automaticamente.';
    }
  }

  // === Chassi (Tela) ===
  let chassiInfo = null;
  let custoChassi = 0;
  if (incluirChassi && chassiSelecionado) {
    const precoMLChassi = pickNum(chassiSelecionado, ['preco_ml','preco','valor_ml','valor'], 0);
    if (precoMLChassi > 0) {
      custoChassi = precoMLChassi * perimetroObraM;
      const esp = /5mm/i.test(chassiSelecionado.nome || '') ? '5 mm'
             : (/3mm/i.test(chassiSelecionado.nome || '') ? '3 mm' : '');
      chassiInfo = {
        nome: chassiSelecionado.nome || 'Chassi',
        espessura: esp,
        mm: esp,
        precoML: precoMLChassi,
        ml: perimetroObraM,
      };
    }
  }

  // Custos planos (vidros / fundos / impressão)
  const custoVidroFrontal = areaPlanosM2 * precoVidroFrontalM2;
  let custoVidroFundoComum = 0;
  if (entreVidros || camisaEntreVidros) {
    custoVidroFundoComum = areaPlanosM2 * num(precoVidroComum, 0);
  }
  const custoVidro = custoVidroFrontal + custoVidroFundoComum;

  const custoFundo      = areaPlanosM2 * precoFundoM2;
  const custoFundoExtra = areaPlanosM2 * precoFundoExtraM2;
  const custoImpressao  = areaObraM2   * precoImpM2;

  // Passe-partout (ML preferencial; fallback m²)
  let custoPP = 0;
  let modoCobrancaPassepartout = null;
  if (temPP && !excedePassepartout) {
    if (precoPP_ML > 0) {
      custoPP = perimetroAberturaM * precoPP_ML;
      modoCobrancaPassepartout = 'ml';
    } else if (precoPP_M2 > 0) {
      custoPP = areaPlanosM2 * precoPP_M2;
      modoCobrancaPassepartout = 'm2';
    } else {
      modoCobrancaPassepartout = 'indefinido';
    }
  }

  // Aberturas extras no passe-partout
  const aberturasExtras = Math.max(0, ABERTURAS - 1);
  const custoAberturasExtras = (temPP && !excedePassepartout)
    ? aberturasExtras * PRECO_ABERTURA_EXTRA
    : 0;

  // Molduras em camadas — perímetro EXTERNO por camada + perda (chanfro)
  const coefPerdaChanfroPorCanto = 1; // cm → m
  const camadas = [moldura1, moldura2, moldura3].filter(Boolean);
  const existeCaixaEmAlgumaCamada = camadas.some(isCaixa);

  let larguraExterna = larguraInterna, alturaExterna = alturaInterna;
  let custosCamadas = [], custoMoldurasTotal = 0;

  camadas.forEach((m, idx) => {
    const wFace = larguraFaceCm(m);
    const precoML = precoMetroMoldura(m);
    larguraExterna += 2 * wFace;
    alturaExterna  += 2 * wFace;
    const pCamadaM = perimetroM(larguraExterna, alturaExterna);
    const perdaChanfroM = (coefPerdaChanfroPorCanto * wFace * 4) / 100;
    const custo = (pCamadaM + perdaChanfroM) * precoML;
    custosCamadas.push({ idx: idx + 1, larguraFaceCm: wFace, perimetroM: pCamadaM, perdaChanfroM, precoML, custo });
    custoMoldurasTotal += custo;
  });

  // Baguete interna (quando caixa ou tipo indica)
  const usaBaguete = existeCaixaEmAlgumaCamada || Boolean(num(tipoSelecionado?.usa_baguete || 0));
  const custoBagueteInterna =
    usaBaguete && num(precoBagueteML, 0) > 0 ? perimetroInternoM * num(precoBagueteML, 0) : 0;

  // Reforço (config fallback percentual)
  const regraReforco = {
    habilitado: true,
    limiteMaiorLadoCm: 70,
    limitePerimetroCm: 240,
    valor: 0.08,            // 8% do custo da moldura (fallback)
    minimoAbsoluto: 25,     // mínimo R$
  };

  // === Reforço: prioriza tabela; se não houver match, usa fallback percentual ===
  const maiorLadoInterno = Math.max(larguraInterna, alturaInterna);
  const perimetroInternoCm = perimetroInternoM * 100;

  let aplicaReforco = false;
  let valorReforco = 0;
  let reforcoInfo = { necessita_reforco: false, nome: null, valorTotal: 0 };

  if (existeCaixaEmAlgumaCamada && Array.isArray(reforcoTabela) && reforcoTabela.length) {
    const W = larguraInterna, H = alturaInterna;
    const pickFaixa = (r, keys) => {
      for (const k of keys) {
        const v = r?.[k];
        const n = Number(String(v ?? "").replace(",", "."));
        if (Number.isFinite(n)) return n;
      }
      return 0;
    };

    const match = reforcoTabela.find((r) => {
      const wMin = pickFaixa(r, ["largura_min_cm","w_min","min_largura"]);
      const wMax = pickFaixa(r, ["largura_max_cm","w_max","max_largura"]) || Infinity;
      const hMin = pickFaixa(r, ["altura_min_cm","h_min","min_altura"]);
      const hMax = pickFaixa(r, ["altura_max_cm","h_max","max_altura"]) || Infinity;
      // aceita rotação
      return (W >= wMin && W <= wMax && H >= hMin && H <= hMax) ||
             (H >= wMin && H <= wMax && W >= hMin && W <= hMax);
    });

    if (match) {
      valorReforco = pickFaixa(match, ["metragem_linear_reforco","preco_total","valor","custo_total"]);
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

  if (existeCaixaEmAlgumaCamada && !aplicaReforco && regraReforco.habilitado) {
    if (maiorLadoInterno >= regraReforco.limiteMaiorLadoCm ||
        perimetroInternoCm >= regraReforco.limitePerimetroCm) {
      aplicaReforco = true;
      const base = custosCamadas[0]?.custo ?? custoMoldurasTotal;
      valorReforco = Math.max(regraReforco.minimoAbsoluto, base * regraReforco.valor);
      reforcoInfo = {
        necessita_reforco: true,
        nome: "Reforço estrutural (moldura caixa)",
        valorTotal: valorReforco
      };
    }
  }

  // Info de risco (opcional)
  const espessuraMolduraMm = num(moldura1?.espessura_mm || 18);
  const riscoMolduraFina = (MAIOR_LADO_CM >= 80 && espessuraMolduraMm < 15);

  // ================== TOTAIS ==================
  const subtotalMateriaisUnit =
    custoMoldurasTotal +
    custoBagueteInterna +
    custoVidro +
    custoFundo +
    custoFundoExtra +
    custoPP +
    custoAberturasExtras +
    custoImpressao +
    num(camisaObjetoExtra, 0) +
    (aplicaReforco ? valorReforco : 0) +
    custoChassi +
    // Diversos unitários
    (Array.isArray(diversosSelecionados)
      ? diversosSelecionados.reduce((acc, dv) => acc + num(pickNum(dv, ['preco','valor','preco_unit','valor_unit'], 0)), 0)
      : 0);

  const valorSemMarkup = subtotalMateriaisUnit * QTD;
  const totalUnitario  = subtotalMateriaisUnit * (1 + MARKUP);
  const valorComMarkup = totalUnitario * QTD;

  // medidas finais EXTERNAS (após camadas)
  const larguraFinal = larguraExterna;
  const alturaFinal  = alturaExterna;

  return {
    valorSemMarkup,
    valorTotal: valorComMarkup,
    excedePassepartout,
    reforcoInfo,
    mensagemAviso: mensagemAviso || null,
    modoCobrancaPassepartout,
    chassiInfo,

    larguraReforco: larguraInterna,
    alturaReforco:  alturaInterna,
    larguraFinal,
    alturaFinal,
    areaTotalM2: areaPlanosM2,

    riscoMolduraFina,

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
