'use strict';
const payment = require('../payment-lib.js');
module.exports = function handler(req, res) {
  if (req.method !== 'GET') return payment.respond(res, 405, { error: 'Método no permitido.' });
  const config = payment.settings();
  const slug = typeof req.query?.pieza === 'string' ? req.query.pieza : '';
  const product = slug ? payment.productBySlug(slug) : null;
  return payment.respond(res, 200, {
    enabled: config.enabled,
    eligible: Boolean(product && payment.productStatus(product) === 'disponible' && payment.currentPrice(product) > 0),
    currency: 'MXN',
    deliveryWindow: '1–3 días hábiles'
  });
};