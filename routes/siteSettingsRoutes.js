import express from 'express';
import { getSiteSettings } from '../controllers/siteSettingsController.js';

const router = express.Router();

router.get('/', getSiteSettings);

export default router;
