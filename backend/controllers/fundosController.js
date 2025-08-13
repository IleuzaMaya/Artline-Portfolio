// backend/controllers/fundosController.js

import db from '../config/db.js';

export async function listarFundos(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM mt_fundos WHERE preco_m2 > 0 AND ativo = 1 ORDER BY nome');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar fundos:', err);
    res.status(500).json({ erro: 'Erro ao buscar fundos' });
  }
}