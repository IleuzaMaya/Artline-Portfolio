// routes/fundosRoutes.js

import express from 'express';
import { listarFundos } from '../controllers/fundosController.js';

const routerFundos = express.Router();
routerFundos.get('/', listarFundos);

export default routerFundos;
