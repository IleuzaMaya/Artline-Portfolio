// backend/routes/baguetesRoutes.js
import { Router } from 'express';

import { listBaguetes } from '../controllers/baguetesController.js';

const router = Router();
router.get('/', listBaguetes); // GET /api/baguetes
export default router;
