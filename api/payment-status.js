'use strict';
const payment = require('../payment-lib.js');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return payment.respond(res, 405, { error: 'Método no permitido.' });
  const config = payment.settings();
  if (!config.enabled) return payment.respond(res, 503, { error: 'La consulta del pago no está disponible en este momento.' });
  const orderId = String(req.query?.order_id || '');
  const reference = payment.parseReference(String(req.query?.reference || ''));
  const details = payment.referenceDetails(reference);
  if (!details || !/^[A-Za-z0-9_-]{10,64}$/.test(orderId)) return payment.respond(res, 400, { error: 'No encontramos la referencia del pago.' });
  try {
    const result = await payment.mercadoPago('/v1/orders/' + encodeURIComponent(orderId), config.token);
    if (!result.response.ok || !result.data) return payment.respond(res, 404, { error: 'No pudimos consultar esta orden de Mercado Pago.' });
    const order = result.data;
    if (String(order.external_reference || '') !== reference) return payment.respond(res, 404, { error: 'La referencia no corresponde a esta orden.' });
    const total = Number(order.total_amount);
    const paid = Number(order.total_paid_amount || 0);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(paid) || paid < 0) return payment.respond(res, 502, { error: 'Mercado Pago devolvió un estado de pago incompleto.' });
    let status = 'pending';
    if (order.status === 'processed' && order.status_detail === 'accredited' && paid >= total) status = 'paid';
    else if (order.status === 'refunded' || order.status_detail === 'refunded') status = 'refunded';
    else if (order.status_detail === 'partially_refunded') status = 'partial_refund';
    else if (order.status === 'failed') status = 'failed';
    else if (order.status === 'canceled') status = 'canceled';
    const cashBalance = details.plan === 'deposit' ? total : 0;
    const title = Array.isArray(order.items) && order.items[0] && typeof order.items[0].title === 'string' ? order.items[0].title.slice(0, 180) : 'Royal Watch MTY';
    return payment.respond(res, 200, {
      orderId: String(order.id),
      reference: reference,
      status: status,
      statusDetail: String(order.status_detail || order.status || 'pending').slice(0, 50),
      plan: details.plan,
      deliveryArea: details.deliveryArea,
      currency: 'MXN',
      orderAmount: payment.amount(total),
      paidAmount: payment.amount(paid),
      productAmount: payment.amount(details.plan === 'deposit' ? total * 2 : total),
      cashBalance: payment.amount(cashBalance),
      productTitle: title,
      deliveryWindow: '1–3 días hábiles'
    });
  } catch (error) {
    console.error('Error de conexión al consultar una order:', error?.name || 'Error');
    return payment.respond(res, 502, { error: 'No pudimos verificar el pago ahora. Vuelve a consultar en unos minutos.' });
  }
};