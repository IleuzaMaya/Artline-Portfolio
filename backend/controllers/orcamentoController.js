// backend/controllers/orcamentoController.js


export async function calcularReforco(req, res) {
  try {
    const { largura_cm, altura_cm, tipo_emoldurado } = req.body;

    if (!largura_cm || !altura_cm || !tipo_emoldurado) {
      return res.status(400).json({ sucesso: false, mensagem: 'Campos obrigatórios ausentes.' });
    }

    const estrutura = await buscarReforcoIdeal(largura_cm, altura_cm, tipo_emoldurado);

    if (estrutura) {
      return res.json({ sucesso: true, estrutura });
    } else {
      return res.status(404).json({ sucesso: false, mensagem: 'Nenhuma estrutura de reforço encontrada.' });
    }
  } catch (error) {
    console.error('Erro em calcularReforco:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
  }
}
