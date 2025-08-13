// backend/controllers/tiposOrcamentoController.js

import pool from '../config/db.js';

export async function listarTiposOrcamento(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM bd_emoldurados.tipos_orcamento WHERE ativo = 1');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar tipos de orçamento:', err);
    res.status(500).json({ erro: 'Erro ao buscar tipos de orçamento' });
  }
}
