// backend/controllers/moldurasController.js

import db from '../config/db.js';

export async function listMolduras(req, res) {
  try {
    // limpa valores tipo "N:1" -> "N"
    const raw = (req.query.uso_tipo ?? '').toString().trim();
    const usoTipo = raw ? raw[0].toUpperCase() : null; // 'N' | 'C' | 'A'

    const params = [];
    let sql = `
      SELECT
        id,
        codigo_principal,
        descricao              AS nome,
        imagem_url,
        uso_tipo,              -- 'N' | 'C' | 'A'
        tipo_moldura,
        largura_mm,
        profundidade_mm,
        preco_metro,
        uso_superficie,
        ativo
      FROM mt_molduras
      WHERE ativo = 1
        AND uso_superficie = 1
    `;

    if (usoTipo && ['N','C','A'].includes(usoTipo)) {
      sql += ' AND uso_tipo = ?';
      params.push(usoTipo);
    }

    sql += ' ORDER BY nome';

    const [rows] = await db.query(sql, params);

    // normalização p/ o front
    const data = rows.map(r => ({
      id: r.id,
      nome: r.nome,
      codigo_principal: r.codigo_principal,
      codigo: r.codigo_principal,                     // alias útil
      imagem_url: r.imagem_url || null,
      uso_tipo: r.uso_tipo,
      tipo: r.tipo_moldura,
      categoria: r.tipo_moldura,
      largura_mm: r.largura_mm,
      largura: r.largura_mm ? Number(r.largura_mm) / 10 : null, // cm
      espessura_mm: r.profundidade_mm,
      preco_por_metro: Number(r.preco_metro),
      preco_metro: Number(r.preco_metro),
    }));

    res.json(data);
  } catch (err) {
    console.error('GET /api/molduras erro:', err);
    res.json([]);
  }
}
