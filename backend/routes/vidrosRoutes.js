// routes/vidrosRoutes.js

import express from 'express';
import { listarVidros } from '../controllers/vidrosController.js';

const routerVidros = express.Router();
routerVidros.get('/', listarVidros);

export default routerVidros;
