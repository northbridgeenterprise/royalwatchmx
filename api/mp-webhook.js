'use strict';
const payment = require('../payment-lib.js');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return payment.respond(res, 405, { error: 'Método no permitido.' });
  const secret = String(process.env.MP_WEBHOOK_SECRET || '').trim();
  if (!secret) return payment.respond(res, 503, { error: 'Webhook no configurado.' });
  const dataId = String(req.query?.['data.id'] || req.query?.data_id || '');
  const requestId = String(req.headers['x-request-id'] || '');
  const signature = String(req.headers['x-signature'] || '');
  if (!payment.hmacValid(signature, requestId, dataId, secret)) return payment.respond(res, 401, { error: 'Firma inválida.' });
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(dataId)) return payment.respond(res, 400, { error: 'Identificador inválido.' });
  const config = payment.settings();
  if (!config.enabled) return payment.respond(res, 503, { error: 'Pagos no configurados.' });
  try {
    const result = await payment.mercadoPago('/v1/orders/' + encodeURIComponent(dataId), config.token);
    if (!result.response.ok || !result.data) return payment.respond(res, 502, { error: 'No se pudo consultar la orden.' });
    const reference = payment.parseReference(String(result.data.external_reference || ''));
    if (!reference) return payment.respond(res, 200, { received: true });
    console.info('Mercado Pago order verificada:', JSON.stringify({ id: String(result.data.id), reference: reference, status: String(result.data.status || 'unknown'), statusDetail: String(result.data.status_detail || 'unknown') }));
    return payment.respond(res, 200, { received: true });
  } catch (error) {
    console.error('Error al verificar notificación de Mercado Pago:', error?.name || 'Error');
    return payment.respond(res, 502, { error: 'No se pudo verificar la notificación.' });
  }
};