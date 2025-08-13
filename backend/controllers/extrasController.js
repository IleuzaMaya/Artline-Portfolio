// controllers/extrasController.js

import db from '../config/db.js';

export async function listarExtras(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM mt_diversos WHERE ativo = 1 ORDER BY nome');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar extras:', error);
    res.status(500).json({ error: 'Erro ao buscar extras' });
  }
}