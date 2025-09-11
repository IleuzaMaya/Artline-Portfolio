// frontend/src/lib/medidas.js
export function qtdPorUnidade(unidade, altura_cm, largura_cm, aberturas = 1) {
  const h = Number(altura_cm) || 0;
  const w = Number(largura_cm) || 0;

  switch ((unidade || "").toUpperCase()) {
    case "M2":
      // cm² -> m²
      return (h * w) / 10_000;

    case "ML":
      // perímetro em METROS (nunca mm!)
      return (2 * (h + w)) / 100 * (Number(aberturas) || 1);

    case "UN":
    default:
      return 1 * (Number(aberturas) || 1);
  }
}
