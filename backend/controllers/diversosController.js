import db from '../config/db.js';

export async function listarDiversos(req, res) {
  try {
    const { ativos = '1', tipo_id = null, tipo = null } = req.query;
    const soAtivos = ativos !== '0';

    let where = [];
    if (soAtivos) where.push('d.ativo = 1');

    let joins = '';
    let params = [];

    if (tipo_id) {
      where.push('d.tipo_orcamento_id = ?');
      params.push(Number(tipo_id));
    } else if (tipo) {
      joins = 'LEFT JOIN tipos_orcamento t ON t.id = d.tipo_orcamento_id';
      where.push('t.nome = ?');
      params.push(String(tipo));
    }

    const sql = `
      SELECT d.id, d.nome, d.preco, d.unidade, d.faixa_aplicacao, d.ativo, d.criado_em
      FROM mt_diversos d
      ${joins}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY d.nome ASC
    `;
    const [rows] = await db.query(sql, params);

    const data = rows.map(r => ({
      ...r,
      preco: Number(r.preco || 0),
      ativo: Number(r.ativo || 0),
      display: r.faixa_aplicacao ? `${r.nome} — ${r.faixa_aplicacao}` : r.nome,
    }));
    res.json(data);
  } catch (err) {
    console.error('GET /diversos erro:', err);
    res.status(500).json({ error: 'Falha ao carregar Diversos.' });
  }
}
