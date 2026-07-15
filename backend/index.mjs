// backend/index.mjs
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// --- suas rotas existentes
import vidrosRoutes from './routes/vidrosRoutes.js';
import fundosRoutes from './routes/fundosRoutes.js';
import passepartoutsRoutes from './routes/passepartoutsRoutes.js';
import impressoesRoutes from './routes/impressoesRoutes.js';
import chassisRoutes from './routes/chassisRoutes.js';
import extrasRoutes from './routes/extrasRoutes.js';
import camisaObjetoRoutes from './routes/camisaObjetoRoutes.js';
import orcamentoRoutes from './routes/orcamentoRoutes.js';
import moldurasRoutes from './routes/moldurasRoutes.js';
import tiposOrcamentoRoutes from './routes/tiposOrcamentoRoutes.js';
import baguetesRoutes from './routes/baguetesRoutes.js';
import diversosRoutes from './routes/diversosRoutes.js';

// --- nova rota de e-mail
import solicitarAcesso from './routes/solicitarAcesso.js';

import adminUsersRoutes from "./routes/adminUsers.js";

const app = express();
app.set('trust proxy', 1); // necessário em Render/Railway para o rate-limit ver o IP real

const PORT = process.env.PORT || 4000;
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);  // curl/postman
    if (ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// (Opcional) um limitador leve só para /api
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 })); // 300 req/min por IP

app.get('/health', (_req, res) => res.send('ok'));

// ✅ rotas /api
app.use('/api/vidros', vidrosRoutes);
app.use('/api/fundos', fundosRoutes);
app.use('/api/passepartouts', passepartoutsRoutes);
app.use('/api/impressoes', impressoesRoutes);
app.use('/api/chassis', chassisRoutes);
app.use('/api/extras', extrasRoutes);
app.use('/api/camisas', camisaObjetoRoutes);
app.use('/api/orcamento', orcamentoRoutes);
app.use('/api/molduras', moldurasRoutes);
app.use('/api/tipos-orcamento', tiposOrcamentoRoutes);
app.use('/api/baguetes', baguetesRoutes);
app.use('/api/diversos', diversosRoutes);

// 📧 rate-limit só para a rota de e-mail (5 req/min por IP)
app.use('/solicitar-acesso', rateLimit({ windowMs: 60_000, max: 5 }));
app.use('/', solicitarAcesso); // o arquivo já registra POST /solicitar-acesso

app.use("/admin", adminUsersRoutes);

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Artline Business Engine API",
    status: "online",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});
