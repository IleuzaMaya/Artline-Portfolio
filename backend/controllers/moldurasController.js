// backend/controllers/moldurasController.js
import db from '../config/db.js'; // deve expor um Pool do 'pg' (db.query(sql, params))

const USOS_VALIDOS = new Set([
  'foto', 'superficie', 'flutuante', 'profundidade', 'camisa', 'tela', 'entre_vidros'
]);

export async function listMolduras(req, res) {
  try {
    const rawUsoTipo = (req.query.uso_tipo ?? '').toString().trim();
    const usoTipo = rawUsoTipo ? rawUsoTipo[0].toUpperCase() : null; // 'N'|'C'|'A'|null
    const q = (req.query.q || '').toString().trim();

    // Detecta "uso" via ?uso=... ou flags ?uso_superficie=1 etc
    let uso = (req.query.uso || '').toString().toLowerCase();
    if (!USOS_VALIDOS.has(uso)) {
      if (String(req.query.uso_foto || '') === '1') uso = 'foto';
      else if (String(req.query.uso_superficie || '') === '1') uso = 'superficie';
      else if (String(req.query.uso_flutuante || '') === '1') uso = 'flutuante';
      else if (String(req.query.uso_profundidade || '') === '1') uso = 'profundidade';
      else if (String(req.query.uso_camisa_objeto || '') === '1') uso = 'camisa';
      else if (String(req.query.uso_tela || '') === '1') uso = 'tela';
      else if (String(req.query.uso_entre_vidros || '') === '1') uso = 'entre_vidros';
      else uso = '';
    }

    const params = [];
    const where = [];

    // ativo = TRUE
    where.push(`m.ativo = TRUE`);

    // filtro por uso (booleans)
    if (USOS_VALIDOS.has(uso)) {
      where.push(`
        (
          ($${params.length + 1} = 'foto'         AND m.uso_foto)
       OR ($${params.length + 2} = 'superficie'   AND m.uso_superficie)
       OR ($${params.length + 3} = 'flutuante'    AND m.uso_flutuante)
       OR ($${params.length + 4} = 'profundidade' AND m.uso_profundidade)
       OR ($${params.length + 5} = 'camisa'       AND m.uso_camisa_objeto)
       OR ($${params.length + 6} = 'tela'         AND m.uso_tela)
       OR ($${params.length + 7} = 'entre_vidros' AND m.uso_entre_vidros)
        )
      `);
      // repete o mesmo valor em cada placeholder
      params.push(uso, uso, uso, uso, uso, uso, uso);

      // Se quiser bloquear "Caixa" para entre_vidros:
      // where.push(`($${params.length + 1} <> 'entre_vidros' OR m.uso_tipo <> 'C')`);
      // params.push(uso);
    }

    // filtro por uso_tipo
    if (usoTipo && ['N', 'C', 'A'].includes(usoTipo)) {
      where.push(`m.uso_tipo = $${params.length + 1}`);
      params.push(usoTipo);
    }

    // busca textual (ILIKE no Postgres)
    if (q) {
      const like = `%${q}%`;
      where.push(`(m.codigo_principal ILIKE $${params.length + 1} OR m.descricao ILIKE $${params.length + 2})`);
      params.push(like, like);
    }

    const sql = `
      SELECT
        m.id,
        m.codigo_principal,
        m.descricao              AS nome,
        m.imagem_url,
        m.uso_tipo,
        m.tipo_moldura,
        m.largura_mm,
        m.profundidade_mm,
        m.rebaixo_mm,
        m.preco_metro,
        m.uso_foto,
        m.uso_superficie,
        m.uso_flutuante,
        m.uso_profundidade,
        m.uso_camisa_objeto,
        m.uso_tela,
        m.uso_entre_vidros
      FROM public.mt_molduras m
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY m.tipo_moldura, m.cor, m.descricao
    `;

    const { rows } = await db.query(sql, params);

    const data = rows.map(r => ({
      id: r.id,
      nome: r.nome,
      codigo_principal: r.codigo_principal,
      codigo: r.codigo_principal,
      imagem_url: r.imagem_url || null,
      uso_tipo: r.uso_tipo,
      tipo: r.tipo_moldura,
      categoria: r.tipo_moldura,
      largura_mm: r.largura_mm,
      largura: r.largura_mm ? Number(r.largura_mm) / 10 : null,
      espessura_mm: r.profundidade_mm,
      rebaixo_mm: r.rebaixo_mm,
      preco_por_metro: Number(r.preco_metro),
      preco_metro: Number(r.preco_metro),
      display: r.codigo_principal ? `${r.codigo_principal} — ${r.nome}` : r.nome,
    }));

    res.json(data);
  } catch (err) {
    console.error('GET /api/molduras erro:', err);
    res.status(500).json({ erro: 'Erro ao buscar molduras' });
  }
}
