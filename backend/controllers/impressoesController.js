// controllers/impressoesController.js

import db from '../config/db.js';

export async function listarImpressoes(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM mt_impressoes WHERE ativo = 1 ORDER BY nome');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar impressoes:', error);
    res.status(500).json({ error: 'Erro ao buscar impressoes' });
  }
}