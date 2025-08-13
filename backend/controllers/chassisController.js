// controllers/chassisController.js

import db from '../config/db.js';

export async function listarChassis(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM mt_chassis WHERE ativo = 1 ORDER BY nome');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar chassis:', error);
    res.status(500).json({ error: 'Erro ao buscar chassis' });
  }
}