//backend/routes/solicitarAcesso.js

import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_EMAIL
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

router.post('/solicitar-acesso', async (req, res) => {
  try {
    const { email, nome = '' } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: 'Informe o e-mail.' });

    const html = `
      <p><b>Pedido de acesso ao Orçamento</b></p>
      <p>Nome: ${escapeHtml(nome)}</p>
      <p>E-mail: ${escapeHtml(email)}</p>
      <p>Enviado em: ${new Date().toLocaleString()}</p>
    `;

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: ADMIN_EMAIL || SMTP_USER,
      replyTo: email,
      subject: 'Orçamento — Solicitação de acesso',
      html,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('solicitar-acesso erro:', err);
    res.status(500).json({ ok: false, error: 'Falha ao enviar e-mail.' });
  }
});

export default router;
