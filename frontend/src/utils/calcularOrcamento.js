// =======================================================
// Calculadora central do orçamento de emoldurado
// - Molduras em ML (M1/M2/M3) — perímetro em METROS
// - Passe-partout (ML *ou* m²) + aberturas extras
// - Vidro (inclui Entre Vidros = 2x)
// - Fundos + foam extra
// - Baguete interna (perímetro do miolo)
// - Impressão (m² da área interna)
// - Chassi (ML do perímetro interno)
// - Camisa/Objeto (unitário por faixa)
// - Diversos (unitário)
// - Reforço (por ML com tabela) com limiar e “forçar”
// =======================================================

export const LIMIAR_REFORCO_M2 = 0.3149; // ~47 x 67 cm

// ----------- helpers compartilhados (exportados) -----------
export const num = (v, d = 0) => {
  // número genérico (cm, m etc.) — aceita "30", "30,05", "1.234,56"
  const s = String(v ?? "").replace(/\s/g, "");
  const n = Number(s.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : d;
};

// Dinheiro robusto: "27", "27,00", "27.00", "R$ 27,00", "2.700" (milhar),
// "2700" (centavos), "27.000" (erro de escala)…
export const moneyNum = (v, d = 0) => {
  const s = String(v ?? "")
    .replace(/[^\d.,-]/g, "")                  // remove R$, espaços etc.
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")       // remove separador de milhar
    .replace(",", ".");
  let n = Number(s);
  if (!Number.isFinite(n)) return d;

  // Correções seguras de escala (tabelas que vêm “em centavos” ou “×1000”)
  if (n > 20000) n = n / 1000;  // 27.000 -> 27
  else if (n > 2000) n = n / 100; // 2.700 -> 27
  return n;
};

export const toM2 = (wCm, hCm) => (num(wCm) / 100) * (num(hCm) / 100);
/** perímetro em METROS a partir de cm */
export const perimetroML = (wCm, hCm) => (2 * (num(wCm) + num(hCm))) / 100;



// ---- pickers estritos por unidade + correção de escala ----
const FIELDS_ML = ['preco_ml', 'valor_ml', 'preco_metro', 'precoMetro', 'preco_ml_moldura'];
const FIELDS_M2 = ['preco_m2', 'valor_m2'];

// Reescala e validação final por unidade (robusto contra cadastros em centavos/×1000 ou "preço de barra")
const fixEscala = (n, kind) => {
  let x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return 0;

  // tetos realistas para nosso domínio
  const HARD_MAX = kind === 'ml' ? 2000 : 10000; // R$/m e R$/m²

  // Se estourou, tentamos reescalar primeiro /100 (centavos), depois /1000 (milhar)
  if (x > HARD_MAX) {
    const d100 = +(x / 100).toFixed(2);
    if (d100 > 0 && d100 <= HARD_MAX) return d100;
    const d1000 = +(x / 1000).toFixed(2);
    if (d1000 > 0 && d1000 <= HARD_MAX) return d1000;
    // como último recurso, trava no teto (ou poderia zerar, se preferir)
    return HARD_MAX;
  }
  return x;
};

export const pickPrecoML = (o) => {
  const raw = FIELDS_ML.map((k) => o?.[k])
    .find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  // Estrito: se não houver campo de ML, retorna 0 (NÃO usa preco/valor genéricos)
  return fixEscala(moneyNum(raw, 0), 'ml');
};

export const pickPrecoM2 = (o) => {
  const raw = FIELDS_M2.map((k) => o?.[k])
    .find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  // Estrito: se não houver campo de m², retorna 0 (NÃO usa preco/valor genéricos)
  return fixEscala(moneyNum(raw, 0), 'm2');
};



// largura de face da moldura (cm)
export const faceLarguraCm = (m) => {
  // 1) campo dedicado (mm)
  const mm = num(m?.largura_mm);
  if (mm > 0) return mm / 10;

  // 2) campo em cm
  const cm = num(m?.largura);
  if (cm > 0) return cm;

  // 3) tenta parsear do nome/descrição: 20X32MM, 28x51mm etc.
  const s = [m?.nome, m?.descricao, m?.display, m?.modelo, m?.titulo].filter(Boolean).join(" ");
  const m1 = s.match(/(\d{1,3})\s*[xX]\s*(\d{1,3})\s*mm/i);
  if (m1) {
    const a = num(m1[1]), b = num(m1[2]);
    const mmFace = Math.min(a, b);   // menor dos dois
    if (mmFace > 0) return mmFace / 10;
  }

  // 4) fallback conservador: 2 cm
  return 2;
};

// GUARD-RAIL: clamp de markup e correção “3000” => 30
export const clampPercent = (v) => {
  let n = num(v, 0);
  if (n >= 1000) n = n / 100;         // 3000 => 30,00%
  return Math.max(0, Math.min(300, n));
};

export const aplicarMarkup = (valor, markupPercent) => {
  const base = Math.max(0, num(valor, 0));
  const m = clampPercent(markupPercent);

  let total = base * (1 + m / 100);

  // Guard-rails adicionais
  if (m <= 300 && total > base * 100) {
    total = base * (1 + m / 100);
  }
  if (total > base * 10 && m > 100) {
    total = base * (1 + (m % 100) / 100);
  }

  return total;
};

const FOLHA_PP = { maior: 152, menor: 102, seguranca: 2 };
export const excedeFolhaPP = (wCm, hCm, margemCm) => {
  const w = num(wCm) + num(margemCm) * 2;
  const h = num(hCm) + num(margemCm) * 2;
  const maxMenor = FOLHA_PP.menor - FOLHA_PP.seguranca;
  const maxMaior = FOLHA_PP.maior - FOLHA_PP.seguranca;
  const okNormal = w <= maxMenor && h <= maxMaior;
  const okRotac  = h <= maxMenor && w <= maxMaior;
  return !(okNormal || okRotac);
};

// reforço: escolha de registro
export function pickReforcoRegistro(tabela, menor, maior) {
  const rows = (Array.isArray(tabela) ? tabela : []).map((r) => ({
    ...r,
    lmin: num(r.largura_min_cm ?? r.largura_min),
    lmax: num(r.largura_max_cm ?? r.largura_max),
    amin: num(r.altura_min_cm ?? r.altura_min),
    amax: num(r.altura_max_cm ?? r.altura_max),
    mlcm: num(r.metragem_linear_reforco ?? r.ml ?? r.metragem ?? 0),
  }));

  // 1) match estrito
  let reg = rows.find(
    (r) => menor >= r.lmin && menor <= r.lmax && maior >= r.amin && maior <= r.amax
  );
  if (reg) return reg;

  // 2) relaxado pelos máximos
  reg = rows.find((r) => menor <= r.lmax && maior <= r.amax);
  if (reg) return reg;

  // 3) menor que ainda cubra
  return (
    rows
      .filter((r) => r.lmax >= menor && r.amax >= maior)
      .sort((a, b) => (a.lmax - b.lmax) || (a.amax - b.amax))[0] || null
  );
}

// ----------- cálculo principal -----------
export async function calcularOrcamento(params = {}) {
  const {
    // dimensões básicas
    altura = 0,
    largura = 0,
    quantidade = 1,
    markup = 0,

    // passe-partout
    margemPassepartout = 0,
    margemEntreVidros = 0,   
    margemFlutuanteCm = 0, 
    
    passepartoutSelecionado = null,
    numAberturas = 1,
    precoAberturaExtra = 0,

    // itens selecionados
    moldura1 = null,
    moldura2 = null,
    moldura3 = null,
    bagueteInternaSelecionada = null,

    vidroSelecionado = null,
    fundoSelecionado = null,
    impressaoSelecionada = null,

    // extras
    fundoExtraSelecionado = null,
    incluirChassi = false,
    chassiSelecionado = null,

    // contexto/tipo
    tipoSelecionado = null, // reservado
    entreVidros = false,
    vidroSomenteComum = false,
    foamExtraAuto = false, // front já injeta o item
    bagueteAuto = false,

    forcarPassepartoutM2 = false, // 👈 NOVO (para “fundo colorido”)

    // Camisa/Objeto
    camisaObjetoTabela = [],
    camisaObjetoExtra = 0,
    forcarCamisaObjetoTipo = null, // 'camisa' | 'objeto' | null
    camisaEntreVidros = false,

    // Diversos
    diversosSelecionados = [],

    // Reforço
    reforcoTabela = [],

    // preços auxiliares vindos do front
    precoSarrafoML = 0,
    precoVidroComumM2 = 0,
    forcarReforco = false,
  } = params;

  // ----------- fase 1: dimensões base -----------
  const H = num(altura);
  const W = num(largura);
  const QTD = Math.max(1, num(quantidade, 1));
  const MARKUP = clampPercent(markup);

  // Passe-partout: pode ser bloqueado pela folha
  // Passe-partout: pode ser bloqueado pela folha
  const excedePP = Boolean(
    passepartoutSelecionado &&
    !forcarPassepartoutM2 &&                 // flutuante não bloqueia por folha
    excedeFolhaPP(W, H, num(margemPassepartout))
  );

  // Base para vidro/fundo/baguete: interna ou “com PP” (se couber na folha)
  const baseW = !excedePP && passepartoutSelecionado ? W + 2 * num(margemPassepartout) : W;
  const baseH = !excedePP && passepartoutSelecionado ? H + 2 * num(margemPassepartout) : H;

  // Respiro: Entre Vidros usa somente a margem do EV; Flutuante usa somente a do flutuante
  const margemRespiroCm = entreVidros
    ? num(margemEntreVidros || 0)
    : num(margemFlutuanteCm || 0);

  const wRef = baseW + 2 * margemRespiroCm;
  const hRef = baseH + 2 * margemRespiroCm;

  // áreas
  const areaInternaM2 = toM2(W, H);
  const areaRefM2 = toM2(wRef, hRef);


  // ----------- fase 2: molduras (em camadas) -----------
  const molduras = [moldura1, moldura2, moldura3].filter(Boolean);
  const custos = {
    moldurasCamadas: [],
    bagueteInterna: 0,
    vidro: 0,
    fundo: 0,
    fundoExtra: 0,
    passepartout: 0,
    passepartoutAberturasExtra: 0,
    impressao: 0,
    chassi: 0,
    reforco: 0,
    camisaObjeto: 0,
    diversos: 0,
  };

  // dimensões crescem a cada camada de moldura (face)
  let wAtual = wRef;
  let hAtual = hRef;

  molduras.forEach((m, idx) => {
    const precoML = pickPrecoML(m);
    const perim = perimetroML(wAtual, hAtual);
    const custo = (precoML > 0 ? perim * precoML : 0);

    custos.moldurasCamadas.push({
      idx,
      ml: perim,
      precoML: Math.max(0, precoML),
      custo,
    });

    // ⚠️ SEMPRE cresce a dimensão, mesmo se a moldura estiver sem preço
    const faceCm = faceLarguraCm(m);
    wAtual += 2 * faceCm;
    hAtual += 2 * faceCm;
  });

  const larguraFinal = wAtual;
  const alturaFinal = hAtual;
  const areaTotalM2 = toM2(larguraFinal, alturaFinal);

  // ----------- fase 3: baguete interna (ml) -----------
  if (bagueteInternaSelecionada) {
    const precoML = pickPrecoML(bagueteInternaSelecionada);
    if (precoML > 0) {
      const ml = perimetroML(wRef, hRef);
      custos.bagueteInterna = ml * precoML;
    }
  } else if (bagueteAuto) {
    // placeholder para auto (se for implementar no backend)
  }

  // ----------- fase 4: passe-partout (ML ou m²) -----------
  let modoCobrancaPassepartout = null;
  let numAberturasConsideradas = Math.max(1, num(numAberturas, 1));

  if (passepartoutSelecionado && !excedePP) {
    const precoMLpp = pickPrecoML(passepartoutSelecionado);
   const precoM2pp = pickPrecoM2(passepartoutSelecionado);

   if (forcarPassepartoutM2 && precoM2pp > 0) {
     custos.passepartout = areaRefM2 * precoM2pp;
     modoCobrancaPassepartout = "m2";
   } else if (precoMLpp > 0) {
     const ml = perimetroML(wRef, hRef);
     custos.passepartout = ml * precoMLpp;
     modoCobrancaPassepartout = "ml";
   } else if (precoM2pp > 0) {
     custos.passepartout = areaRefM2 * precoM2pp;
     modoCobrancaPassepartout = "m2";
   }

    const unitExtra = num(precoAberturaExtra);
    const extras = Math.max(0, numAberturasConsideradas - 1);
    if (unitExtra > 0 && extras > 0) {
      custos.passepartoutAberturasExtra = extras * unitExtra;
    }
  } else {
    numAberturasConsideradas = 1;
  }

  // ----------- fase 5: vidro (m²) -----------
  const temVidroFrente = Boolean(vidroSelecionado) || vidroSomenteComum || entreVidros;
  if (temVidroFrente) {
    const precoFrenteBase = vidroSomenteComum
      ? num(precoVidroComumM2)
      : pickPrecoM2(vidroSelecionado);

    // Se for entre vidros e não houver vidro escolhido, usa comum na frente
    const precoFrenteAjust = (entreVidros && !vidroSomenteComum && !vidroSelecionado)
      ? num(precoVidroComumM2)
      : precoFrenteBase;

    const precoFundoComum = entreVidros ? num(precoVidroComumM2) : 0;

    const areaM2ParaVidro = areaRefM2; // vidro cobre a área “com PP”
    const custoVidro =
      areaM2ParaVidro * Math.max(0, precoFrenteAjust) +
      areaM2ParaVidro * Math.max(0, precoFundoComum);

    custos.vidro = Math.max(0, custoVidro);
  }

  // ----------- fase 6: fundo (m²) -----------
  if (fundoSelecionado) {
    const precoM2 = pickPrecoM2(fundoSelecionado);
    if (precoM2 > 0) {
      custos.fundo = areaRefM2 * precoM2;
    }
  }
  
  if (fundoExtraSelecionado || foamExtraAuto) {
    const f = fundoExtraSelecionado;
    const precoM2 = f ? pickPrecoM2(f) : 0;
    if (precoM2 > 0) {
      // flutuante quer 2× foam: não bloqueia duplicado
      custos.fundoExtra = areaRefM2 * precoM2;
    }
  }

  // ----------- fase 7: impressão (m²) -----------
  if (impressaoSelecionada) {
    const precoM2 = pickPrecoM2(impressaoSelecionada);
    if (precoM2 > 0) {
      custos.impressao = areaInternaM2 * precoM2;
    }
  }

  // ----------- fase 8: chassi (perímetro) -----------
  let chassiInfo = null;
  if (incluirChassi && chassiSelecionado) {
    const precoML = pickPrecoML(chassiSelecionado);
    const ml = perimetroML(W, H);
    custos.chassi = ml * precoML;

    const mm = /5\s*mm/i.test(chassiSelecionado?.nome || "")
      ? "5 mm"
      : /3\s*mm/i.test(chassiSelecionado?.nome || "")
      ? "3 mm"
      : "";
    chassiInfo = { mm, precoML, ml };
  }

  // ----------- fase 9: reforço (tabela + sarrafo ml) -----------
  const temCaixaExterna = [moldura1, moldura2, moldura3].some((m) => {
    const uso = String(m?.uso_tipo || "").toUpperCase();
    const tipoTxt = String(m?.tipo || m?.categoria || m?.descricao || "");
    return uso === "C" || /caixa/i.test(tipoTxt);
  });

  // usa área “com PP” quando existir
  const areaParaReforcoM2 = areaRefM2;
  const abaixoDoLimiar = areaParaReforcoM2 <= LIMIAR_REFORCO_M2;

  let reforcoInfo = null;
  const podeReforcar =
    temCaixaExterna &&
    Array.isArray(reforcoTabela) &&
    reforcoTabela.length &&
    (!abaixoDoLimiar || forcarReforco);

  if (podeReforcar) {
    const menor = Math.min(wRef, hRef);
    const maior = Math.max(wRef, hRef);

    const reg = pickReforcoRegistro(reforcoTabela, menor, maior);
    if (reg) {
      let ml = num(reg.metragem_linear_reforco ?? reg.ml ?? reg.metragem ?? 0);

      // GUARD-RAIL: se vier em centímetros, converte para METROS
      if (ml > 20) ml = ml / 100;

      const precoML = num(precoSarrafoML);
      const valorTotal = +(ml * precoML).toFixed(2);

      reforcoInfo = {
        necessita_reforco: true,
        registroId: reg.id ?? null,
        nome: reg.observacoes || "Estrutura de reforço",
        ml,
        precoML,
        valorTotal,
      };

      custos.reforco = valorTotal;
    }
  }

  // ----------- fase 10: Camisa / Objeto -----------
  let camisaObjetoInfo = null;
  if (forcarCamisaObjetoTipo) {
    const ate = areaInternaM2 <= 1 ? /até/i : /acima/i;
    const tipo = String(forcarCamisaObjetoTipo).toLowerCase(); // 'camisa' | 'objeto'

    const pick = (arr) => {
      const cands = (arr || []).filter((x) =>
        String(x?.tipo || "").toLowerCase().includes(tipo)
      );
      if (!cands.length) return null;
      const prefer = cands.find((x) => ate.test(x?.faixa_aplicacao || ""));
      return prefer || cands[0];
    };

    const item = pick(camisaObjetoTabela);
    if (item) {
      const preco = num(item.preco);
      if (preco > 0) {
        custos.camisaObjeto += preco;
        camisaObjetoInfo = {
          aplicado: true,
          modo: "unitario",
          faixa: item.faixa_aplicacao || (areaInternaM2 <= 1 ? "até 1 m²" : "acima de 1 m²"),
          preco,
          tipo,
        };
      }
    }
    if (num(camisaObjetoExtra) > 0) {
      custos.camisaObjeto += num(camisaObjetoExtra);
    }
  }

  // ----------- fase 11: Diversos (lista já selecionada no front) -----------
  let diversosInfo = { itens: [] };
  if (Array.isArray(diversosSelecionados) && diversosSelecionados.length) {
    diversosSelecionados.forEach((it) => {
      const p = num(it.preco);
      if (p > 0) {
        custos.diversos += p;
        diversosInfo.itens.push({
          nome: it.nome,
          faixa: it.faixa_aplicacao || it.faixa || null,
          preco: p,
        });
      }
    });
  }

  // ----------- somas e retorno -----------
  let valorSemMarkup =
    custos.moldurasCamadas.reduce((s, x) => s + num(x.custo), 0) +
    num(custos.bagueteInterna) +
    num(custos.vidro) +
    num(custos.fundo) +
    num(custos.fundoExtra) +
    num(custos.passepartout) +
    num(custos.passepartoutAberturasExtra) +
    num(custos.impressao) +
    num(custos.chassi) +
    num(custos.reforco) +
    num(custos.camisaObjeto) +
    num(custos.diversos);

  // aplica quantidade
  valorSemMarkup = Math.max(0, valorSemMarkup * Math.max(1, QTD));
  valorSemMarkup = Number(valorSemMarkup.toFixed(2));

  const valorTotal = aplicarMarkup(valorSemMarkup, MARKUP);

  // mensagem explicativa (opcional)
  let mensagemAviso = null;
  if (passepartoutSelecionado && excedePP) {
    mensagemAviso =
      "❗ Dimensões excedem a folha de passepartout (102 × 152 cm). Passe-partout desativado automaticamente.";
  }

  return {
    valorSemMarkup,
    valorTotal,

    custos,

    // dimensões
    alturaFinal,
    larguraFinal,
    areaTotalM2,
    alturaReforco: hRef, // “com PP” (quando existir)
    larguraReforco: wRef,

    // flags / modos
    excedePassepartout: excedePP,
    modoCobrancaPassepartout,
    numAberturasConsideradas,

    // infos auxiliares
    chassiInfo,
    reforcoInfo,
    camisaObjetoInfo,
    diversosInfo,

    // opcional
    mensagemAviso,
  };
}
