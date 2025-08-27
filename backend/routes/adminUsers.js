// backend/routes/adminUsers.js
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";

const router = Router();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no backend/.env");
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

router.use(rateLimit({ windowMs: 60_000, max: 10 }));

// Procura usuário por e-mail varrendo páginas (sem getUserByEmail)
async function findUserIdByEmail(email) {
  const target = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const hit = users.find(u => (u.email || '').toLowerCase() === target);
    if (hit) return hit.id;
    if (users.length < perPage) break;
  }
  return null;
}

/**
 * POST /admin/create-client
 * body: { email, nome, senha? }
 * - se NÃO existir:
 *    - se senha vier => envia link de SIGNUP já com senha (usuário é criado ao clicar)
 *    - se não vier  => envia link de SIGNUP para definir a senha ao clicar
 * - se JÁ existir:
 *    - se senha vier => atualiza a senha
 *    - se não vier  => envia link de RECOVERY (trocar/definir senha)
 */
router.post("/create-client", async (req, res) => {
  try {
    const { email, nome, senha } = req.body || {};
    if (!email) return res.status(400).json({ error: "email é obrigatório" });

    const emailLower = email.toLowerCase();
    const redirectTo = `${process.env.PUBLIC_APP_URL || "http://localhost:5173"}/login`;

    let userId = await findUserIdByEmail(emailLower);

    if (!userId) {
      // Usuário ainda não existe -> envia link de cadastro (signup)
      const payload = {
        type: "signup",
        email: emailLower,
        options: {
          data: { role: "cliente", nome: nome || null },
          redirectTo
        }
      };
      if (senha && senha.length >= 6) {
        // algumas versões aceitam "password" na raiz:
        // @ts-ignore (tipagem pode não listar, mas backend entende)
        payload.password = senha;
      }

      const { data, error } = await supabaseAdmin.auth.admin.generateLink(payload);
      if (error) throw error;

      // Não precisamos do userId agora. Ele será criado ao clicar no link.
      await supabaseAdmin
        .from("acessos_permitidos")
        .upsert({ email: emailLower, role: "cliente", ativo: true }, { onConflict: "email" });

      return res.json({ ok: true, mode: "signup_link_sent" });
    }

    // Já existe
    if (senha && senha.length >= 6) {
      const upd = await supabaseAdmin.auth.admin.updateUserById(userId, { password: senha });
      if (upd.error) throw upd.error;
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, nome: nome || null, tipo: "cliente" }, { onConflict: "id" });
      await supabaseAdmin
        .from("acessos_permitidos")
        .upsert({ email: emailLower, role: "cliente", ativo: true }, { onConflict: "email" });

      return res.json({ ok: true, mode: "password_updated", user_id: userId });
    }

    // Já existe e sem senha -> envia link de recovery
    const { error: genErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: emailLower,
      options: { redirectTo }
    });
    if (genErr) throw genErr;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, nome: nome || null, tipo: "cliente" }, { onConflict: "id" });
    await supabaseAdmin
      .from("acessos_permitidos")
      .upsert({ email: emailLower, role: "cliente", ativo: true }, { onConflict: "email" });

    return res.json({ ok: true, mode: "recovery_link_sent", user_id: userId });
  } catch (err) {
    console.error("create-client error:", err);
    return res.status(500).json({ error: err.message || "Falha ao criar cliente" });
  }
});

export default router;
