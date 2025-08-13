//frontend/src/services/orcamentoService.js

import axios from 'axios';

export async function obterReforcoIdeal(largura_cm, altura_cm, tipo_emoldurado) {
  try {
    const response = await axios.post('http://localhost:4000/api/orcamento/reforco', {
      largura_cm,
      altura_cm,
      tipo_emoldurado
    });
    return response.data.estrutura;
  } catch (error) {
    console.error('Erro ao buscar reforço:', error);
    return null;
  }
}
