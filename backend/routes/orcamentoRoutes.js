// backend/routes/orcamentoRoutes.js

import express from 'express';
import { calcularReforco } from '../controllers/orcamentoController.js';

const router = express.Router();
router.post('/reforco', calcularReforco);

export default router;
