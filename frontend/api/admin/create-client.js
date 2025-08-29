// Rota serverless: POST /api/admin/create-client
// Node function — POST /api/admin/reset-password
// Usa a ANON key para disparar o e-mail de recuperação pelo Supabase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // precisa existir no Vercel (server-side)
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });

    const redirectTo =
      (process.env.VITE_SITE_URL || 'https://app.artemoldurados.com.br') + '/reset';

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Erro interno' });
  }
};
