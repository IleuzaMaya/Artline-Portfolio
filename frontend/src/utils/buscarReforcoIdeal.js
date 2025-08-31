// frontend/src/utils/buscarReforcoIdeal.js

/**
 * Define reforço ideal com base na área, tipo de moldura e largura da moldura.
 * @param {number} larguraFinal - em cm
 * @param {number} alturaFinal - em cm
 * @param {string} usoTipo - 'C', 'N' ou 'A'
 * @param {number} larguraMolduraPrincipal - em cm
 * @returns {Object} { nome, custo_total_reforco, alertaRisco }
 */


export function buscarReforcoIdealPorTabela(larguraCm, alturaCm, reforcoTabela = []) {
  const W = Number(larguraCm) || 0;
  const H = Number(alturaCm) || 0;
  if (!W || !H || !Array.isArray(reforcoTabela) || !reforcoTabela.length)
    return { nome: "", custo_total_reforco: 0, alertaRisco: false };

  const num = (v, d = 0) => {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : d;
  };

  const row = reforcoTabela.find((r) => {
    const wMin = num(r.largura_min_cm, 0);
    const wMax = num(r.largura_max_cm, Infinity);
    const hMin = num(r.altura_min_cm, 0);
    const hMax = num(r.altura_max_cm, Infinity);
    return (W >= wMin && W <= wMax && H >= hMin && H <= hMax) ||
           (H >= wMin && H <= wMax && W >= hMin && W <= hMax);
  });

  if (!row) return { nome: "", custo_total_reforco: 0, alertaRisco: false };

  return {
    nome: row.observacoes || "Reforço estrutural",
    custo_total_reforco: num(row.metragem_linear_reforco, 0),
    alertaRisco: false,
  };
}
