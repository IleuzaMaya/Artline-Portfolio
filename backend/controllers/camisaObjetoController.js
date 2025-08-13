// controllers/camisaObjetoController.js

import db from '../config/db.js';

export async function listarCamisaObjeto(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM mt_camisa_objeto WHERE ativo = 1 ORDER BY nome');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar camisa/objeto:', error);
    res.status(500).json({ error: 'Erro ao buscar camisa/objeto' });
  }
}