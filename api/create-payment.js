'use strict';

const crypto = require('node:crypto');
const payment = require('../payment-lib.js');

module.exports = async function handler(req, res) {
  const config = payment.settings();
  if (req.method !== 'POST') return payment.respond(res, 405, { error: 'Método no permitido.' });
  if (!config.enabled) return payment.respond(res, 503, { error: 'El pago en línea estará disponible cuando se configure Mercado Pago.' });
  if (!payment.allowedOrigin(req, config)) return payment.respond(res, 403, { error: 'No se pudo validar el origen de esta solicitud.' });

  const body = payment.parseBody(req);
  if (!body || typeof body !== 'object') return payment.respond(res, 400, { error: 'No pudimos leer los datos de la compra.' });
  const product = payment.productBySlug(body.slug);
  if (!product || payment.productStatus(product) !== 'disponible') return payment.respond(res, 409, { error: 'Esta pieza ya no está disponible para compra en línea.' });
  if (body.plan !== 'full' && body.plan !== 'deposit') return payment.respond(res, 400, { error: 'Selecciona una opción de pago válida.' });
  if (body.deliveryArea !== 'metro' && body.deliveryArea !== 'national') return payment.respond(res, 400, { error: 'Selecciona una opción de entrega válida.' });
  if (body.plan === 'deposit' && body.deliveryArea !== 'metro') return payment.respond(res, 400, { error: 'El anticipo con saldo en efectivo está disponible únicamente en Monterrey y su área metropolitana.' });
  if (typeof body.idempotencyKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.idempotencyKey)) return payment.respond(res, 400, { error: 'No pudimos iniciar el pago; vuelve a intentarlo.' });

  const brand = String(product.marca || '').trim().toLowerCase();
  const fullSetEligible = brand === 'rolex' || brand === 'cartier';
  const includeFullSet = body.includeFullSet === true;
  if (includeFullSet && !fullSetEligible) return payment.respond(res, 400, { error: 'El Full Set opcional solo está disponible en fichas Rolex y Cartier.' });
  const fullSetAmount = includeFullSet ? 1000 : 0;
  const basePrice = payment.currentPrice(product);
  if (!Number.isFinite(basePrice) || basePrice <= 0) return payment.respond(res, 409, { error: 'Consulta el precio con un asesor para continuar.' });
  const listedPrice = basePrice + fullSetAmount;
  const payable = body.plan === 'deposit' ? Math.round(listedPrice / 2) : listedPrice;
  const payableText = payment.amount(payable);
  const reference = 'RWM-' + (body.plan === 'deposit' ? 'DEP' : 'FULL') + '-' + (body.deliveryArea === 'metro' ? 'MTY' : 'NAC') + (includeFullSet ? '-FS' : '') + '-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const base = payment.appBaseUrl(req, config);
  const returnUrl = (state) => {
    const url = new URL('/pago.html', base);
    url.searchParams.set('estado', state);
    url.searchParams.set('pedido', reference);
    return url.href;
  };
  const purchaseLabel = body.plan === 'deposit' ? 'Anticipo del 50%' : 'Pago completo';
  const deliveryLabel = body.deliveryArea === 'metro' ? 'Monterrey y área metropolitana' : 'Envío nacional';
  const fullSetLabel = includeFullSet ? ' | Full Set (+$1,000 MXN)' : '';
  const title = ('Royal Watch MTY | ' + product.marca + ' ' + product.modelo + fullSetLabel + ' | ' + purchaseLabel).slice(0, 240);
  const orderBody = {
    type: 'online',
    processing_mode: 'manual',
    capture_mode: 'automatic_async',
    total_amount: payableText,
    external_reference: reference,
    description: title,
    items: [{ title: title, quantity: 1, unit_price: payableText, total_amount: payableText }],
    config: { online: { success_url: returnUrl('success'), failure_url: returnUrl('failure'), pending_url: returnUrl('pending'), auto_return: 'approved' } }
  };

  try {
    const result = await payment.mercadoPago('/v1/orders', config.token, { method: 'POST', body: orderBody, idempotencyKey: body.idempotencyKey });
    if (!result.response.ok || !result.data) {
      console.error('Mercado Pago no pudo crear la order:', result.response.status, result.data?.message || result.data?.error || 'respuesta inválida');
      return payment.respond(res, 502, { error: 'Mercado Pago no pudo iniciar el pago. Inténtalo de nuevo o escríbenos por WhatsApp.' });
    }
    const checkoutUrl = payment.safeOrderUrl(result.data.checkout_url);
    if (!checkoutUrl || !result.data.id || String(result.data.external_reference || '') !== reference) return payment.respond(res, 502, { error: 'Mercado Pago no devolvió una orden de pago válida. Vuelve a intentarlo.' });
    return payment.respond(res, 201, {
      checkoutUrl: checkoutUrl,
      orderId: String(result.data.id),
      reference: reference,
      plan: body.plan,
      deliveryArea: body.deliveryArea,
      amount: payableText,
      fullSet: includeFullSet,
      fullSetAmount: payment.amount(fullSetAmount),
      currency: 'MXN',
      deliveryWindow: '1–3 días hábiles',
      product: { brand: product.marca, model: product.modelo, slug: payment.slugFor(product) },
      deliveryLabel: deliveryLabel
    });
  } catch (error) {
    console.error('Error de conexión al crear una order de Mercado Pago:', error?.name || 'Error');
    return payment.respond(res, 502, { error: 'No pudimos conectar con Mercado Pago. Inténtalo de nuevo en unos minutos.' });
  }
};