// backend/routes/tiposOrcamentoRoutes.js
import express from 'express';
import { listarTiposOrcamento } from '../controllers/tiposOrcamentoController.js';

const router = express.Router();

router.get('/', listarTiposOrcamento);

export default router;
