// backend/controllers/baguetesController.js

import db from '../config/db.js';

export async function listBaguetes(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
         id,
         nome,
         preco_ml AS preco_metro,   -- alias p/ o frontend esperar "preco_metro"
         unidade,
         COALESCE(ativo, 1) AS ativo
       FROM mt_baguetes
       WHERE COALESCE(ativo, 1) = 1
       ORDER BY nome`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/baguetes erro:', err);
    res.json([]); // fallback para não travar o front
  }
}
