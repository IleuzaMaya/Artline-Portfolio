// backend/routes/diversosRoutes.js
import { Router } from 'express';
import { listarDiversos } from '../controllers/diversosController.js';

const router = Router();

// Base: /api/diversos
router.get('/', listarDiversos);

export default router;
