// backend/controllers/passepartoutsController.js

import db from '../config/db.js';

export async function listarPassepartouts(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM mt_passepartouts WHERE preco_ml > 0 AND ativo = 1 ORDER BY nome');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar passepartouts:', err);
    res.status(500).json({ erro: 'Erro ao buscar passepartouts' });
  }
}