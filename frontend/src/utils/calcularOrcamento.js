// frontend/src/utils/calcularOrcamento.js
// =======================================================
// Calculadora central do orçamento de emoldurado
// - Trata molduras em ML (M1/M2/M3)
// - Passe-partout (ML ou m²) + aberturas extras
// - Vidro (inclui Entre Vidros = 2x)
// - Fundos + foam extra
// - Baguete interna (perímetro do miolo)
// - Impressão (m² da área interna)
// - Chassi (ML do perímetro interno)
// - Camisa/Objeto (unitário, até/acima de 1 m²)
// - Diversos (unitário)
// - Reforço (por ML com tabela mt_reforco) com limiar de área
//
// Saída: valores + breakdown + dimensões finais + flags
// =======================================================

/** Parser numérico robusto (milhar/decimal, vírgula/ponto). */
const num = (v, d = 0) => {
  if (v === null || v === undefined) return d;
  const s = String(v).replace(/[^\d,.\-]/g, "");
  const semMilhar = s.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const norm = semMilhar.replace(",", ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : d;
};

/** Tenta as chaves em ordem e devolve o primeiro número válido. */
const pickNum = (obj, keys, d = 0) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;
    const n = num(v, NaN);
    if (Number.isFinite(n)) return n;
  }
  return d;
};

const toM2 = (wCm, hCm) => (Math.max(0, num(wCm)) / 100) * (Math.max(0, num(hCm)) / 100);
const perimetroM = (wCm, hCm) => (2 * (Math.max(0, num(wCm)) + Math.max(0, num(hCm)))) / 100;

/** Largura da face da moldura em cm (usa mm se disponível). */
const faceCm = (m) => {
  if (!m) return 0;
  const mm = num(m.largura_mm, 0);
  if (mm > 0) return mm / 10;
  return num(m.largura, 0);
};

/** Identifica se uma moldura é "caixa". */
const ehCaixa = (m) => !!m && (String(m?.uso_tipo || "").toUpperCase() === "C" || /caixa/i.test(m?.tipo || m?.categoria || ""));

/** Retorna a moldura caixa mais externa (M3 > M2 > M1). */
const caixaMaisExterna = (m1, m2, m3) => {
  const isCx = (m) => ehCaixa(m);
  if (isCx(m3)) return m3;
  if (isCx(m2)) return m2;
  if (isCx(m1)) return m1;
  return null;
};

/** Converte valor "metragem_linear_reforco" para METROS.
 *  Se o número parecer cm (>= 50), divide por 100. Se for <= 50, assume já estar em metros. */
const toMetrosFromMLPossiblyCm = (v) => {
  const n = num(v, 0);
  if (n <= 0) return 0;
  return n >= 50 ? n / 100 : n; // 205.4 -> 2.054 m ; 3.72 -> 3.72 m
};

/** Checa se cabe na folha de PP (aceita rotação). */
const cabeNaFolhaPP = (wCm, hCm, margemCm, folha = { menor: 102, maior: 152, seguranca: 2 }) => {
  const w = num(wCm) + 2 * num(margemCm);
  const h = num(hCm) + 2 * num(margemCm);
  const maxMenor = folha.menor - folha.seguranca;
  const maxMaior = folha.maior - folha.seguranca;
  const okNormal = w <= maxMenor && h <= maxMaior;
  const okRot = h <= maxMenor && w <= maxMaior;
  return okNormal || okRot;
};

/**
 * @typedef {Object} CalcularOpts
 * @property {string|number} altura
 * @property {string|number} largura
 * @property {number} quantidade
 * @property {number} markup
 * @property {number} margemPassepartout
 * @property {Object|null} moldura1
 * @property {Object|null} moldura2
 * @property {Object|null} moldura3
 * @property {Object|null} impressaoSelecionada
 * @property {Object|null} vidroSelecionado
 * @property {Object|null} fundoSelecionado
 * @property {Object|null} passepartoutSelecionado
 * @property {Object|null} bagueteInternaSelecionada
 * @property {Object[]} camisaObjetoTabela
 * @property {('camisa'|'objeto'|null)} forcarCamisaObjetoTipo
 * @property {boolean} camisaEntreVidros
 * @property {Object|null} fundoExtraSelecionado
 * @property {Object[]} diversosSelecionados
 * @property {boolean} entreVidros
 * @property {boolean} vidroSomenteComum
 * @property {boolean} foamExtraAuto
 * @property {boolean} bagueteAuto
 * @property {number} numAberturas
 * @property {number} precoAberturaExtra
 * @property {boolean} incluirChassi
 * @property {Object|null} chassiSelecionado
 * @property {Object[]} reforcoTabela  // linhas vinda de /reforco
 * @property {number} [precoSarrafoML] // R$/m (sarrafo). Default 3.20
 * @property {('ml'|'cm'|'preco')} [reforcoValorEm] // Como interpretar metragem_linear_reforco (default "ml")
 */

/**
 * Calcula o orçamento completo.
 * @param {CalcularOpts} opts
 * @returns {Promise<Object>}
 */
export async function calcularOrcamento(opts) {
  // --------- ENTRADAS BÁSICAS ----------
  const alturaCm = num(opts?.altura, 0);
  const larguraCm = num(opts?.largura, 0);
  const qtd = Math.max(1, num(opts?.quantidade, 1));
  const markupPct = Math.max(0, num(opts?.markup, 0));
  const margemPPcm = Math.max(0, num(opts?.margemPassepartout, 0));

  const m1 = opts?.moldura1 || null;
  const m2 = opts?.moldura2 || null;
  const m3 = opts?.moldura3 || null;

  const vidro = opts?.vidroSelecionado || null;
  const fundo = opts?.fundoSelecionado || null;
  const pp = opts?.passepartoutSelecionado || null;
  const baguete = opts?.bagueteInternaSelecionada || null;
  const imp = opts?.impressaoSelecionada || null;

  const diversos = Array.isArray(opts?.diversosSelecionados) ? opts.diversosSelecionados : [];
  const camisaTabela = Array.isArray(opts?.camisaObjetoTabela) ? opts.camisaObjetoTabela : [];
  const camisaTipo = opts?.forcarCamisaObjetoTipo || null;

  const entreVidros = Boolean(opts?.entreVidros);
  const vidroSomenteComum = Boolean(opts?.vidroSomenteComum);
  const incluirChassi = Boolean(opts?.incluirChassi);
  const chassi = incluirChassi ? (opts?.chassiSelecionado || null) : null;

  const foamExtra = opts?.fundoExtraSelecionado || null;

  const reforcoTabela = Array.isArray(opts?.reforcoTabela) ? opts.reforcoTabela : [];
  const precoSarrafoML = num(opts?.precoSarrafoML, 3.20); // seu mt_sarrafo inicial
  const reforcoValorEm = (opts?.reforcoValorEm || "ml").toLowerCase(); // "ml" | "cm" | "preco"
  const precoVidroComumM2 = num(opts?.precoVidroComumM2, 0);

  // ---------- DERIVADOS DE DIMENSÕES ----------
  // Dimensões com passe-partout (o “miolo” que recebe vidro/fundo/PP)
  const wComPP = larguraCm + 2 * margemPPcm;
  const hComPP = alturaCm + 2 * margemPPcm;

  // Faces
  const f1 = faceCm(m1);
  const f2 = faceCm(m2);
  const f3 = faceCm(m3);
  const somaFaces = f1 + f2 + f3;

  // Final com molduras (pega até onde houver)
  const somaFacesM23 = f1 + (m2 ? f2 : 0) + (m3 ? f3 : 0);
  const wFinal = wComPP + 2 * somaFacesM23;
  const hFinal = hComPP + 2 * somaFacesM23;

  // Área total (m²) — final com molduras (para exibição)
  const areaTotalM2 = toM2(wFinal, hFinal);

  // Perímetros por camada (usando o “contorno externo” de cada)
  const perM1 = m1 ? perimetroM(wComPP + 2 * f1, hComPP + 2 * f1) : 0;
  const perM2 = m2 ? perimetroM(wComPP + 2 * (f1 + f2), hComPP + 2 * (f1 + f2)) : 0;
  const perM3 = m3 ? perimetroM(wComPP + 2 * (f1 + f2 + f3), hComPP + 2 * (f1 + f2 + f3)) : 0;

  // Perímetro “miolo” (útil para baguete interna)
  const perMiolo = perimetroM(wComPP, hComPP);

  // ---------- FOLHA PASSE-PARTOUT & EXCEDÊNCIA ----------
  const FOLHA_PP = { menor: 102, maior: 152, seguranca: 2 };
  const excedePassepartout =
    !!pp && !cabeNaFolhaPP(larguraCm, alturaCm, margemPPcm, FOLHA_PP);

  // ---------- CUSTOS ----------
  const custos = {
    moldurasCamadas: [
      { camada: 1, ml: perM1, precoML: 0, custo: 0 },
      { camada: 2, ml: perM2, precoML: 0, custo: 0 },
      { camada: 3, ml: perM3, precoML: 0, custo: 0 },
    ],
    bagueteInterna: 0,
    vidro: 0,
    fundo: 0,
    fundoExtra: 0,
    passepartout: 0,
    passepartoutAberturasExtra: 0,
    impressao: 0,
    chassi: 0,
    camisaObjeto: 0,
    diversos: 0,
    reforco: 0,
  };

  // --- Molduras (ML) por camada ---
  const precoMLFromMoldura = (m) =>
    pickNum(m, ["preco_metro", "preco_ml", "valor_ml", "preco_m", "valor_m", "preco", "valor"], 0);

  if (m1 && perM1 > 0) {
    const p = precoMLFromMoldura(m1);
    custos.moldurasCamadas[0].precoML = p;
    custos.moldurasCamadas[0].custo = perM1 * p;
  }
  if (m2 && perM2 > 0) {
    const p = precoMLFromMoldura(m2);
    custos.moldurasCamadas[1].precoML = p;
    custos.moldurasCamadas[1].custo = perM2 * p;
  }
  if (m3 && perM3 > 0) {
    const p = precoMLFromMoldura(m3);
    custos.moldurasCamadas[2].precoML = p;
    custos.moldurasCamadas[2].custo = perM3 * p;
  }

  // --- Baguete interna (ML) quando houver seleção ---
  if (baguete && perMiolo > 0) {
    const p = pickNum(baguete, ["preco_ml", "valor_ml", "preco_m", "valor_m", "preco", "valor"], 0);
    custos.bagueteInterna = perMiolo * p;
  }

  // --- Vidro (m²) ---
  // Tamanho do vidro = miolo (com PP). Em Entre-vidros, cobramos 2x o vidro selecionado.
  if (vidro) {
    const areaVidro = toM2(wComPP, hComPP);
    const pv = pickNum(vidro, ["preco_m2", "valor_m2", "preco", "valor"], 0);
    if (areaVidro > 0 && pv > 0) {
      if (entreVidros) {
        // frente = vidro selecionado ; fundo = vidro comum
        const precoFundo = precoVidroComumM2 > 0 ? precoVidroComumM2 : pv; // fallback no selecionado
        custos.vidro = areaVidro * (pv + precoFundo);
      } else {
        custos.vidro = areaVidro * pv;
      }
    }
  }

  // --- Fundos (m²) ---
  if (fundo) {
    const areaFundo = toM2(wComPP, hComPP);
    const pf = pickNum(fundo, ["preco_m2", "valor_m2", "preco", "valor"], 0);
    if (areaFundo > 0 && pf > 0) {
      custos.fundo = areaFundo * pf;
    }
  }

  // Fundo extra (foam AD etc.) (m²)
  if (foamExtra) {
    const areaFundo = toM2(wComPP, hComPP);
    const pf = pickNum(foamExtra, ["preco_m2", "valor_m2", "preco", "valor"], 0);
    if (areaFundo > 0 && pf > 0) {
      custos.fundoExtra = areaFundo * pf;
    }
  }

  // --- Passe-partout (ML ou m²) ---
  let modoCobrancaPassepartout = null;
  let numAberturasConsideradas = Math.max(1, num(opts?.numAberturas, 1));

  if (pp && !excedePassepartout) {
    const pML = pickNum(pp, ["preco_ml", "valor_ml", "preco_m", "valor_m"], 0);
    const pM2 = pickNum(pp, ["preco_m2", "valor_m2"], 0);

    if (pML > 0) {
      // Cobrança por ML: usamos o perímetro do "buraco" (área interna, sem margem)
      const perPP = perimetroM(larguraCm, alturaCm);
      custos.passepartout = perPP * pML;
      modoCobrancaPassepartout = "ml";
    } else if (pM2 > 0) {
      // Cobrança por m²: usamos a área da FOLHA útil (miolo com margem)
      const areaPP = toM2(wComPP, hComPP);
      custos.passepartout = areaPP * pM2;
      modoCobrancaPassepartout = "m2";
    }

    // Aberturas extras (quando houver)
    const precoAberturaExtra = Math.max(0, num(opts?.precoAberturaExtra, 0));
    const extras = Math.max(0, numAberturasConsideradas - 1);
    if (precoAberturaExtra > 0 && extras > 0) {
      custos.passepartoutAberturasExtra = extras * precoAberturaExtra;
    }
  } else {
    // Se excedeu a folha, neutralizamos PP e zeramos aberturas extras
    modoCobrancaPassepartout = null;
    numAberturasConsideradas = 1;
  }

  // --- Impressão (m²) (na área interna) ---
  if (imp) {
    const areaImp = toM2(larguraCm, alturaCm);
    const pi = pickNum(imp, ["preco_m2", "valor_m2", "preco", "valor"], 0);
    if (areaImp > 0 && pi > 0) {
      custos.impressao = areaImp * pi;
    }
  }

  // --- Chassi (ML), se selecionado/forçado (Tela etc.) ---
  if (chassi && incluirChassi) {
    const perCh = perimetroM(larguraCm, alturaCm);
    const pc = pickNum(chassi, ["preco_ml", "valor_ml", "preco_m", "valor_m", "preco", "valor"], 0);
    if (perCh > 0 && pc > 0) {
      custos.chassi = perCh * pc;
    }
  }

  // --- Camisa / Objeto (unitário até/acima 1 m²) ---
  let camisaObjetoInfo = { aplicado: false, modo: "unitario", faixa: null, valor: 0 };
  if (camisaTipo === "camisa" || camisaTipo === "objeto") {
    const area = toM2(larguraCm, alturaCm);
    const ate = camisaTabela.find((x) =>
      String(x?.tipo || "").toLowerCase() === camisaTipo &&
      /até/i.test(String(x?.faixa_aplicacao || ""))
    );
    const acima = camisaTabela.find((x) =>
      String(x?.tipo || "").toLowerCase() === camisaTipo &&
      /acima/i.test(String(x?.faixa_aplicacao || ""))
    );
    const escolhido = area <= 1 ? (ate || acima) : (acima || ate);
    if (escolhido) {
      const preco = pickNum(escolhido, ["preco", "valor"], 0);
      custos.camisaObjeto = preco;
      camisaObjetoInfo = {
        aplicado: true,
        modo: "unitario",
        faixa: area <= 1 ? "até 1 m²" : "acima de 1 m²",
        valor: preco,
      };
    }
  }

  // --- Diversos (unitário) ---
  if (diversos.length) {
    custos.diversos = diversos.reduce((acc, it) => {
      const p = pickNum(it, ["preco", "valor", "preco_unit", "valor_unit"], 0);
      return acc + p;
    }, 0);
  }

  // --- Reforço (por ML) com limiar de área ---
  // Critério: só considerar reforço para "moldura CAIXA" (mais externa)
  // e quando a área (miolo com PP) for MAIOR que 47,5 x 67,5 cm.
  // Dimensões de referência para reforço = com PP (miolo).
  const molduraCaixaExterna = caixaMaisExterna(m1, m2, m3);
  let reforcoInfo = {
    necessita_reforco: false,
    nome: null,
    ml: 0,
    precoML: 0,
    valorTotal: 0,
    faixa: null,
    obs: null,
  };

  const LIMIAR_REFORCO_M2 = (47.5 / 100) * (67.5 / 100); // ~0.32156 m²
  const areaParaReforcoM2 = toM2(wComPP, hComPP);
  const abaixoDoLimiar = areaParaReforcoM2 <= LIMIAR_REFORCO_M2;

  if (molduraCaixaExterna && reforcoTabela.length && !abaixoDoLimiar) {
    // Tenta encaixar nas faixas da tabela
    const w = wComPP;
    const h = hComPP;

    // normaliza campos possíveis
    const pega = (r, ...keys) => pickNum(r, keys, 0);
    const pegaTxt = (r, ...keys) => {
      for (const k of keys) {
        const v = r?.[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return null;
    };

    // tipo: 'canvas' ou 'matte' (já veio filtrado pela API, mas deixo fallback)
    const tipoRow = (r) =>
      (String(r?.tipo || r?.tipo_emoldurado || "").trim().toLowerCase()) ||
      (String(r?.emoldurado || "").trim().toLowerCase());

    const linhasCompat = reforcoTabela.filter((r) => {
      const wMin = pega(r, "largura_min_cm", "min_largura_cm", "w_min_cm");
      const wMax = pega(r, "largura_max_cm", "max_largura_cm", "w_max_cm");
      const hMin = pega(r, "altura_min_cm", "min_altura_cm", "h_min_cm");
      const hMax = pega(r, "altura_max_cm", "max_altura_cm", "h_max_cm");
      // aceita nas duas orientações: (w dentro e h dentro) OU (h dentro e w dentro)
      const okNormal = (w >= wMin && w <= wMax && h >= hMin && h <= hMax);
      const okSwap = (h >= wMin && h <= wMax && w >= hMin && w <= hMax);
      return okNormal || okSwap;
    });

    // escolhe a primeira que bater (ou a mais "justa")
    let escolhida = null;
    if (linhasCompat.length) {
      // critério: menor excedente (wMax*hMax)
      escolhida = linhasCompat.sort((a, b) => {
        const aArea = pega(a, "largura_max_cm", "w_max_cm") * pega(a, "altura_max_cm", "h_max_cm");
        const bArea = pega(b, "largura_max_cm", "w_max_cm") * pega(b, "altura_max_cm", "h_max_cm");
        return aArea - bArea;
      })[0];
    }

    if (escolhida) {
      // Interpretar a coluna 'metragem_linear_reforco'
      let mlValor = pega(escolhida, "metragem_linear_reforco", "ml_reforco", "ml", "metros", "comprimento_total_cm");
      let custoReforco = 0;
      let precoMLAplicado = 0;

      if (reforcoValorEm === "preco") {
        // Se a tabela já for PREÇO total
        custoReforco = mlValor;
        mlValor = 0;
      } else {
        // mlValor representa comprimento. Se parecer cm (>=50), converte para m.
        const mlMetros =
          reforcoValorEm === "cm" ? (num(mlValor, 0) / 100) : toMetrosFromMLPossiblyCm(mlValor);
        precoMLAplicado = precoSarrafoML;
        custoReforco = mlMetros * precoMLAplicado;
        mlValor = mlMetros;
      }

      reforcoInfo = {
        necessita_reforco: true,
        nome: tipoRow(escolhida) || "reforço",
        ml: mlValor,
        precoML: precoMLAplicado,
        valorTotal: custoReforco,
        faixa: `${pega(escolhida, "largura_min_cm", "w_min_cm")}–${pega(escolhida, "largura_max_cm", "w_max_cm")} cm × ${pega(escolhida, "altura_min_cm", "h_min_cm")}–${pega(escolhida, "altura_max_cm", "h_max_cm")} cm`,
        obs: pegaTxt(escolhida, "observacoes", "obs", "descricao") || null,
      };

      custos.reforco = custoReforco;
    }
  }

  // ---------- SOMATÓRIO ----------
  const somaMolduras =
    custos.moldurasCamadas.reduce((acc, x) => acc + (x?.custo || 0), 0);

  const subtotalUnit =
    somaMolduras +
    custos.bagueteInterna +
    custos.vidro +
    custos.fundo +
    custos.fundoExtra +
    custos.passepartout +
    custos.passepartoutAberturasExtra +
    custos.impressao +
    custos.chassi +
    custos.camisaObjeto +
    custos.diversos +
    custos.reforco;

  const valorSemMarkup = subtotalUnit * qtd;
  const valorTotal = valorSemMarkup * (1 + markupPct / 100);

  // ---------- SAÍDA ----------
  return {
    valorSemMarkup,
    valorTotal,

    custos,

    // Dimensões para exibição
    alturaFinal: hFinal,
    larguraFinal: wFinal,
    areaTotalM2: areaTotalM2,

    // “Com PP” (usamos esses como base de reforço / miolo)
    alturaReforco: hComPP,
    larguraReforco: wComPP,

    // Flags para o UI
    excedePassepartout,
    numAberturasConsideradas,

    // Informações auxiliares
    modoCobrancaPassepartout,
    reforcoInfo,
    chassiInfo: chassi ? { mm: (String(chassi?.nome || "").match(/(\d+)mm/i)?.[1] || null) } : null,
    camisaObjetoInfo: camisaObjetoInfo,

    // detalhamento opcional para o front
    diversosInfo: { itens: diversos },

    mensagemAviso: excedePassepartout
      ? "Dimensões excedem a folha de passepartout (102 × 152 cm). Passe-partout desativado."
      : null,
  };
}
