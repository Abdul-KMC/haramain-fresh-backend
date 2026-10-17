export const getPublicSiteSettings = () => ({
  supportPhone: process.env.PUBLIC_SUPPORT_PHONE || '+9199352**1*7',
  contactEmail: process.env.PUBLIC_SUPPORT_EMAIL || 'csek**19**@gmail.com',
  instagramQrUrl:
    process.env.PUBLIC_INSTAGRAM_QR_URL ||
    'https://drive.google.com/uc?export=view&id=1n5ZE6YYWHrDorqetUktaJOtAUm_4ldAo',
});
