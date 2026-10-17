import { getPublicSiteSettings } from '../config/siteSettings.js';

export const getSiteSettings = (req, res) => {
  res.json(getPublicSiteSettings());
};
