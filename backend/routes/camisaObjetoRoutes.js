// routes/camisaObjetoRoutes.js

import express from 'express';
import { listarCamisaObjeto } from '../controllers/camisaObjetoController.js';

const routerCamisaObjeto = express.Router();
routerCamisaObjeto.get('/', listarCamisaObjeto);

export default routerCamisaObjeto;