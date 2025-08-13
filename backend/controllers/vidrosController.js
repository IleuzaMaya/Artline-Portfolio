// backend/controllers/vidrosController.js
import db from '../config/db.js';

export async function listarVidros(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM mt_vidros WHERE preco_m2 > 0 AND ativo = 1 ORDER BY nome');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar vidros:', err);
    res.status(500).json({ erro: 'Erro ao buscar vidros' });
  }
}



