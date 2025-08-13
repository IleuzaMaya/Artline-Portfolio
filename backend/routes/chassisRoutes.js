// routes/chassisRoutes.js

import express from 'express';
import { listarChassis } from '../controllers/chassisController.js';

const routerChassis = express.Router();
routerChassis.get('/', listarChassis);

export default routerChassis;
