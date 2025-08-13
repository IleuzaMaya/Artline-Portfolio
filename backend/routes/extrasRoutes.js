// routes/extrasRoutes.js

import express from 'express';
import { listarExtras } from '../controllers/extrasController.js';

const routerExtras = express.Router();
routerExtras.get('/', listarExtras);

export default routerExtras;
