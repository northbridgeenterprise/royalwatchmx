'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(value) || 0);
  const params = new URLSearchParams(location.search);
  const queryReference = params.get('pedido') || '';
  const returnState = params.get('estado') || '';
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem('rwm_last_mp_order') || 'null'); } catch { saved = null; }
  const reference = queryReference || (saved && saved.reference) || '';
  const orderId = params.get('order_id') || params.get('id') || (saved && saved.orderId) || '';
  let attempts = 0;
  const maxAttempts = 14;

  function setStatus(status, message) {
    const card = document.querySelector('.payment-card');
    card.dataset.status = status;
    byId('payment-title').textContent = status === 'paid' ? 'Pago confirmado' : status === 'refunded' ? 'Pago reembolsado' : status === 'partial_refund' ? 'Pago en revisión' : status === 'failed' || status === 'canceled' ? 'Pago no completado' : 'Estamos verificando tu pago';
    byId('payment-message').textContent = message;
    byId('payment-spinner').hidden = status !== 'pending' || attempts >= maxAttempts;
  }

  function showError(message) {
    attempts = maxAttempts;
    byId('payment-details').hidden = true;
    byId('payment-whatsapp').hidden = false;
    byId('payment-whatsapp').href = 'https://api.whatsapp.com/send?phone=528121980008&text=' + encodeURIComponent('Hola, necesito ayuda con una compra de Royal Watch MTY. Referencia: ' + (reference || 'no disponible') + '. ' + message);
    setStatus('unknown', message);
  }

  function showOrder(order) {
    const plan = order.plan === 'deposit' ? '50% de anticipo en línea' : 'Pago completo en línea';
    const delivery = order.deliveryArea === 'metro' ? 'Monterrey y área metropolitana' : 'Envío nacional';
    byId('payment-reference').textContent = order.reference;
    byId('payment-product').textContent = String(order.productTitle || 'Royal Watch MTY').replace(/^Royal Watch MTY\s*\|\s*/i, '');
    byId('payment-plan').textContent = plan;
    byId('payment-paid').textContent = money(order.paidAmount);
    byId('payment-delivery').textContent = delivery + ' · 1 a 3 días hábiles';
    const balanceRow = byId('payment-balance-row');
    balanceRow.hidden = order.plan !== 'deposit' || order.status !== 'paid';
    byId('payment-balance').textContent = money(order.cashBalance);
    byId('payment-details').hidden = false;

    if (order.status === 'paid') {
      const message = order.plan === 'deposit'
        ? 'Tu anticipo quedó confirmado por Mercado Pago. El saldo se paga en efectivo al recibir en Monterrey y área metropolitana. Coordina dirección y horario con el asesor.'
        : 'Mercado Pago confirmó el pago completo. Coordina dirección y horario con el asesor para la entrega.';
      setStatus('paid', message);
      const wa = 'Hola, mi pago de Royal Watch MTY fue confirmado. Referencia: ' + order.reference + '. Pieza: ' + order.productTitle + '. ' + (order.plan === 'deposit' ? 'Elegí 50% de anticipo y pagaré el resto en efectivo al recibir en Monterrey.' : 'Elegí el pago completo en línea.') + ' ¿Me ayudan a coordinar la entrega?';
      byId('payment-whatsapp').href = 'https://api.whatsapp.com/send?phone=528121980008&text=' + encodeURIComponent(wa);
      byId('payment-whatsapp').hidden = false;
    } else if (order.status === 'refunded') {
      setStatus('refunded', 'Mercado Pago reporta que esta orden fue reembolsada. Si tienes dudas, un asesor puede ayudarte con la referencia.');
      byId('payment-whatsapp').hidden = false;
    } else if (order.status === 'partial_refund') {
      setStatus('partial_refund', 'Mercado Pago reporta un ajuste o reembolso parcial. Contacta a un asesor antes de coordinar la entrega.');
      byId('payment-whatsapp').hidden = false;
    } else if (order.status === 'failed' || order.status === 'canceled') {
      setStatus(order.status, 'Mercado Pago no confirmó el cobro. Puedes intentarlo nuevamente desde la ficha del reloj o escribirnos con esta referencia.');
      byId('payment-whatsapp').hidden = false;
    } else {
      const detail = returnState === 'failure' ? 'El cobro todavía no aparece aprobado en Mercado Pago. Si el banco dejó un movimiento pendiente, espera a que se resuelva antes de volver a pagar.' : 'Mercado Pago aún está procesando el cobro. No coordinaremos el envío hasta que aparezca como aprobado.';
      setStatus('pending', detail);
      if (attempts >= maxAttempts) byId('payment-whatsapp').hidden = false;
    }
  }

  async function checkPayment() {
    attempts += 1;
    try {
      const query = new URLSearchParams({ order_id: orderId, reference: reference });
      const response = await fetch('/api/payment-status?' + query.toString(), { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No pudimos verificar tu pago.');
      showOrder(data);
      if (data.status === 'pending' && attempts < maxAttempts) window.setTimeout(checkPayment, 4500);
    } catch (error) {
      if (attempts < maxAttempts) {
        byId('payment-message').textContent = 'Estamos reconectando con Mercado Pago para consultar el estado. No inicies otro pago mientras confirmamos esta orden.';
        window.setTimeout(checkPayment, 4500);
      } else {
        showError(error?.message || 'No pudimos verificar el pago. Conserva tu referencia y escríbenos antes de volver a intentarlo.');
      }
    }
  }

  if (!reference || !orderId) {
    showError('No encontramos el identificador de la orden. Revisa tu cuenta de Mercado Pago y escríbenos antes de intentar otro cobro.');
    return;
  }
  byId('payment-reference').textContent = reference;
  checkPayment();
})();