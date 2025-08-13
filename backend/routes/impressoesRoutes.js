// routes/impressoesRoutes.js

import express from 'express';
import { listarImpressoes } from '../controllers/impressoesController.js';

const routerImpressoes = express.Router();
routerImpressoes.get('/', listarImpressoes);

export default routerImpressoes;
