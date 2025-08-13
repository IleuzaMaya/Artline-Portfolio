// frontend/src/utils/buscarReforcoIdeal.js

/**
 * Define reforço ideal com base na área, tipo de moldura e largura da moldura.
 * @param {number} larguraFinal - em cm
 * @param {number} alturaFinal - em cm
 * @param {string} usoTipo - 'C', 'N' ou 'A'
 * @param {number} larguraMolduraPrincipal - em cm
 * @returns {Object} { nome, custo_total_reforco, alertaRisco }
 */
export function buscarReforcoIdeal(larguraFinal, alturaFinal, usoTipo, larguraMolduraPrincipal) {
  const area = (larguraFinal * alturaFinal) / 10000; // m²
  let nome = '';
  let custo_total_reforco = 0;
  let alertaRisco = false;

  if (usoTipo === 'C') {
    if (area >= 0.6 && area <= 0.85) {
      nome = 'Reforço leve (0.6m² a 0.85m²)';
      custo_total_reforco = 15;
    } else if (area > 0.85 && area <= 1.2) {
      nome = 'Reforço médio (0.85m² a 1.2m²)';
      custo_total_reforco = 22;
    } else if (area > 1.2) {
      nome = 'Reforço estrutural (acima de 1.2m²)';
      custo_total_reforco = 35;
    }
  } else {
    // Outras molduras: apenas alerta de risco
    if (area > 0.6 && larguraMolduraPrincipal < 2) {
      alertaRisco = true;
    }
  }

  return { nome, custo_total_reforco, alertaRisco };
}
