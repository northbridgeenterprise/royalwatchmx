'use strict';

const crypto = require('node:crypto');
const WATCHES_PRODUCTS = require('./watches_catalog.js');
const ALLOWED_HOSTS = new Set(['royalwatchmx.com', 'www.royalwatchmx.com']);

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
}

function settings() {
  const token = String(process.env.MP_ACCESS_TOKEN || '').trim();
  const mode = String(process.env.MP_MODE || '').trim().toLowerCase();
  const deployment = String(process.env.VERCEL_ENV || '').toLowerCase();
  const tokenMatches = mode === 'production' ? token.startsWith('APP_USR-') : mode === 'test' && token.startsWith('TEST-');
  const environmentMatches = deployment === 'production' ? mode === 'production' : deployment === 'preview' || deployment === 'development' ? mode === 'test' : mode === 'test';
  const webhookReady = deployment !== 'production' || Boolean(String(process.env.MP_WEBHOOK_SECRET || '').trim());
  const enabled = String(process.env.MP_CHECKOUT_ENABLED || '').toLowerCase() === 'true' && tokenMatches && environmentMatches && webhookReady;
  return { token, mode, enabled, deployment };
}

function allowedOrigin(req, config) {
  const origin = req.headers.origin;
  if (!origin) return false;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.protocol !== 'https:' && !(config.mode === 'test' && parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return false;
  if (ALLOWED_HOSTS.has(parsed.hostname)) return true;
  return config.mode === 'test' && config.deployment !== 'production' && parsed.hostname.endsWith('.vercel.app');
}

function slugFor(watch) {
  return [watch.marca, watch.modelo, watch.referencia || 'sin-referencia'].join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function productBySlug(slug) {
  if (typeof slug !== 'string' || slug.length > 180) return null;
  return WATCHES_PRODUCTS.find((item) => slugFor(item) === slug) || null;
}

function currentPrice(product) {
  const listed = Number(product && product.precio) || 0;
  const month = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Monterrey', month: 'numeric' }).format(new Date());
  const brand = String(product && product.marca || '').trim().toLowerCase();
  return listed > 0 && month === '9' && (brand === 'rolex' || brand === 'cartier') ? Math.round(listed * 0.9) : listed;
}

function appBaseUrl(req, config) {
  const configured = String(process.env.APP_BASE_URL || '').trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname)) return parsed.origin;
    } catch { /* use trusted request or canonical default */ }
  }
  const origin = req.headers.origin;
  if (config.mode === 'test' && origin) {
    try { if (new URL(origin).hostname.endsWith('.vercel.app')) return new URL(origin).origin; } catch { /* continue */ }
  }
  return 'https://royalwatchmx.com';
}

function productStatus(watch) {
  return String(watch && watch.status || 'Disponible').trim().toLowerCase();
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

function amount(value) {
  return (Math.round((Number(value) + Number.EPSILON) * 100) / 100).toFixed(2);
}

async function mercadoPago(path, token, options = {}) {
  const response = await fetch('https://api.mercadopago.com' + path, {
    method: options.method || 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.idempotencyKey ? { 'X-Idempotency-Key': options.idempotencyKey } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* upstream response is not JSON */ }
  return { response, data };
}

function safeOrderUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const trusted = host === 'mercadopago.com.mx' || host.endsWith('.mercadopago.com.mx') || host === 'mercadopago.com' || host.endsWith('.mercadopago.com');
    return url.protocol === 'https:' && trusted ? url.href : null;
  } catch { return null; }
}

function parseReference(value) {
  return typeof value === 'string' && /^RWM-(FULL|DEP)-(MTY|NAC)(-FS)?-[A-F0-9]{12}$/.test(value) ? value : null;
}

function referenceDetails(reference) {
  const parsed = parseReference(reference);
  if (!parsed) return null;
  const parts = parsed.split('-');
  return { plan: parts[1] === 'DEP' ? 'deposit' : 'full', deliveryArea: parts[2] === 'MTY' ? 'metro' : 'national', fullSet: parts[3] === 'FS' };
}

function hmacValid(signature, requestId, dataId, secret) {
  if (!signature || !requestId || !dataId || !secret) return false;
  const values = {};
  String(signature).split(',').forEach((part) => {
    const index = part.indexOf('=');
    if (index < 0) return;
    values[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  });
  if (!/^\d+$/.test(values.ts || '') || !/^[a-f0-9]{64}$/i.test(values.v1 || '')) return false;
  const manifest = 'id:' + String(dataId).toLowerCase() + ';request-id:' + requestId + ';ts:' + values.ts + ';';
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest();
  const received = Buffer.from(values.v1, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

module.exports = { ALLOWED_HOSTS, amount, appBaseUrl, allowedOrigin, currentPrice, hmacValid, mercadoPago, parseBody, parseReference, productBySlug, productStatus, referenceDetails, respond, safeOrderUrl, settings, slugFor };