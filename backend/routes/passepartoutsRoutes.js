// routes/passepartoutsRoutes.js

import express from 'express';
import { listarPassepartouts } from '../controllers/passepartoutsController.js';

const routerPassepartouts = express.Router();
routerPassepartouts.get('/', listarPassepartouts);

export default routerPassepartouts;
