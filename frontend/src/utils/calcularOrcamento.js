/**
 * Calcula orçamento de emoldurados com regras de:
 * - Moldura Caixa: reforço automático acima de certos limites
 * - Passepartout: checagem de folha (102 × 152) com rotação e margem
 * - Baguete interna: perímetro com perda técnica implícita na moldura
 * - Entre Vidros: adiciona vidro comum no fundo (além do vidro frontal escolhido)
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

  // perfil / comportamentos
  entreVidros = false,
  precoVidroComumM2 = null, // se não vier, cai no preço do vidro selecionado
  vidroSomenteComum = false,
  foamExtraAuto = false, // sem uso direto no cálculo
  bagueteAuto = false,   // idem, custo vem do item selecionado

  // passe-partout
  numAberturas = 1,
  precoAberturaExtra = 0,
}) {
  const num = (v, d = 0) => {
    const n = Number(String(v ?? '').toString().replace(',', '.'));
    return Number.isFinite(n) ? n : d;
  };
  const pick = (o, ks = []) => ks.map(k => o?.[k]).find(v => Number.isFinite(num(v)));
  const toM2 = (wCm, hCm) => (wCm / 100) * (hCm / 100);
  const perimetroM = (wCm, hCm) => (2 * (wCm + hCm)) / 100;

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

  // preços planos
  const precoVidroSelM2 = num(pick(vidroSelecionado || {}, ['preco_m2','valor_m2','preco','valor']), 0);
  const precoFundoM2    = num(pick(fundoSelecionado || {}, ['preco_m2','valor_m2','preco','valor']), 0);
  const precoFundoExtraM2 = num(pick(fundoExtraSelecionado || {}, ['preco_m2','valor_m2','preco','valor']), 0);
  const precoImpM2      = num(pick(impressaoSelecionada || {}, ['preco_m2','valor_m2','preco','valor']), 0);

  // preço do vidro comum (fallback para o selecionado)
  const precoVidroComum = num(precoVidroComumM2, precoVidroSelM2);
  const precoVidroFrontalM2 = vidroSomenteComum ? precoVidroComum : precoVidroSelM2;

  // Passe-partout: preferir ML; fallback m²
  const precoPP_ML = num(pick(passepartoutSelecionado || {}, ['preco_ml','valor_ml']), 0);
  const precoPP_M2 = num(pick(passepartoutSelecionado || {}, ['preco_m2','valor_m2','preco','valor']), 0);

  // Baguete interna (ml)
  const precoBagueteML =
    num(
      pick(bagueteInternaSelecionada || {}, ['preco_metro','preco_ml','valor_ml']),
      pick(tipoSelecionado || {}, ['preco_metro_baguete','preco_baguete_ml','preco_baguete']) || 0
    );

  // Molduras
  const larguraFaceCm = (m) => {
    const mm = num(m?.largura_mm);
    return mm > 0 ? mm / 10 : num(m?.largura, 0);
  };
  const precoMetroMoldura = (m) =>
    num(pick(m || {}, ['preco_por_metro','preco_metro','preco','valor_metro']), 0);

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

  // Custos planos
  const custoVidroFrontal = areaPlanosM2 * precoVidroFrontalM2;

  // Entre Vidros: adiciona vidro comum no “fundo”
  let custoVidroFundoComum = 0;
  if (entreVidros) {
    const precoBaseComum = precoVidroComum;
    custoVidroFundoComum = areaPlanosM2 * precoBaseComum;
  }
  const custoVidro = custoVidroFrontal + custoVidroFundoComum;

  const custoFundo      = areaPlanosM2 * precoFundoM2;
  const custoFundoExtra = areaPlanosM2 * precoFundoExtraM2; // Foam extra (flutuante/camisa)
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
  const coefPerdaChanfroPorCanto = 1; // cm → convertido para m
  const camadas = [moldura1, moldura2, moldura3].filter(Boolean);
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
  const isCaixa =
    (moldura1?.uso_tipo === 'C') ||
    /caixa/i.test(moldura1?.tipo || moldura1?.categoria || '');
  const usaBaguete = isCaixa || Boolean(num(tipoSelecionado?.usa_baguete || 0));
  const custoBagueteInterna =
    usaBaguete && num(precoBagueteML, 0) > 0 ? perimetroInternoM * num(precoBagueteML, 0) : 0;

  // Reforço (só caixa)
  const regraReforco = {
    habilitado: true,
    limiteMaiorLadoCm: 70,
    limitePerimetroCm: 240,
    tipoCobranca: 'percentual',
    valor: 0.08,
    minimoAbsoluto: 25,
  };
  const maiorLadoInterno = Math.max(larguraInterna, alturaInterna);
  const perimetroInternoCm = perimetroInternoM * 100;
  let aplicaReforco = false, valorReforco = 0;
  if (isCaixa && regraReforco.habilitado) {
    if (maiorLadoInterno >= regraReforco.limiteMaiorLadoCm ||
        perimetroInternoCm >= regraReforco.limitePerimetroCm) {
      aplicaReforco = true;
      const base = custosCamadas[0]?.custo ?? custoMoldurasTotal;
      valorReforco = Math.max(regraReforco.minimoAbsoluto, base * regraReforco.valor);
    }
  }
  const reforcoInfo = aplicaReforco
    ? { necessita_reforco: true, nome: 'Reforço estrutural (moldura caixa)', valorTotal: valorReforco }
    : { necessita_reforco: false, nome: null, valorTotal: 0 };

  // Camisa/Objeto: adicional por faixa
  const isCamisaObjeto = /camisa|objeto/i.test(
    tipoSelecionado?.nome || tipoSelecionado?.tipo || ''
  );
  let camisaObjetoExtra = 0;
  let camisaObjetoInfo = { aplicado: false };

  if (isCamisaObjeto && Array.isArray(camisaObjetoTabela) && camisaObjetoTabela.length) {
    const ate1 = camisaObjetoTabela.find(r =>
      /até/i.test(r.faixa_aplicacao || r.faixa || '') ||
      String(r.faixa_aplicacao || '').includes('1')
    );
    const acima1 = camisaObjetoTabela.find(r => /acima/i.test(r.faixa_aplicacao || r.faixa || ''));

    const linha = areaObraM2 <= 1 ? ate1 : (acima1 || ate1);
    if (linha) {
      const precoM2 = num(pick(linha, ['preco_m2','valor_m2']), 0);
      const precoFixo = num(pick(linha, ['preco','valor']), 0);
      camisaObjetoExtra = precoM2 > 0 ? (precoM2 * areaObraM2) : precoFixo;
      camisaObjetoInfo = {
        aplicado: true,
        faixa: areaObraM2 <= 1 ? 'até 1 m²' : 'acima de 1 m²',
        base: precoM2 > 0 ? precoM2 : precoFixo,
        modo: precoM2 > 0 ? 'm2' : 'fixo',
        valor: camisaObjetoExtra,
      };
    }
  }

  // Info de risco (opcional)
  const espessuraMolduraMm = num(moldura1?.espessura_mm || 18);
  const riscoMolduraFina = (maiorLadoInterno >= 80 && espessuraMolduraMm < 15);

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
    camisaObjetoExtra +
    (aplicaReforco ? valorReforco : 0);

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

    larguraReforco: larguraInterna,
    alturaReforco:  alturaInterna,
    larguraFinal,
    alturaFinal,
    areaTotalM2: areaPlanosM2,

    riscoMolduraFina,
    camisaObjetoInfo,

    // Para o UI poder discriminar
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
      camisaObjetoExtra,

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
