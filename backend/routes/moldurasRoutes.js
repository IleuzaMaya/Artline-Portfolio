// backend/routes/moldurasRoutes.js

import { Router } from 'express';
import { listMolduras } from '../controllers/moldurasController.js';

const router = Router();
router.get('/', listMolduras);
export default router;
