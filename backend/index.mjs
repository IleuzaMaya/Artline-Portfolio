// backend/index.mjs
import express from 'express';
import cors from 'cors';

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

const app = express();
app.use(cors());
app.use(express.json());

// ✅ ROTAS OFICIAIS (apenas uma vez cada)
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});
