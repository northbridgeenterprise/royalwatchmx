# Activar Mercado Pago en Royal Watch MTY

El checkout ya está integrado, pero permanece apagado hasta configurar las credenciales privadas en Vercel. No coloques llaves en archivos del sitio, en GitHub ni en mensajes.

## Variables en Vercel

En el proyecto de Vercel, entra a **Settings → Environment Variables** y crea estas variables. Después vuelve a desplegar el sitio.

| Variable | Preview (pruebas) | Production (cobros reales) |
|---|---|---|
| `MP_ACCESS_TOKEN` | Token de prueba que comienza con `TEST-` | Token privado productivo que comienza con `APP_USR-` |
| `MP_MODE` | `test` | `production` |
| `MP_CHECKOUT_ENABLED` | `true` cuando quieras probar | `true` cuando revises y actives ventas reales |
| `APP_BASE_URL` | Puede dejarse vacío para usar la URL de Preview | `https://royalwatchmx.com` |
| `MP_WEBHOOK_SECRET` | Secreto Webhook de la app de prueba, si está disponible | Secreto de Webhooks de la aplicación productiva |

Las credenciales se guardan en Vercel y el servidor nunca las devuelve al navegador. El modo Preview solo acepta credenciales de prueba; el entorno Production solo acepta credenciales productivas. En Production también es obligatorio configurar el secreto del Webhook antes de activar el checkout. Mientras falte una variable o no coincidan el modo y el token, el sitio oculta el botón de compra.

## Configurar avisos de pago

En **Tus integraciones → tu aplicación → Webhooks → Configurar notificaciones**, agrega la URL HTTPS `https://royalwatchmx.com/api/mp-webhook` y selecciona **Order (Mercado Pago)**. Guarda la configuración y copia el secreto generado como `MP_WEBHOOK_SECRET` en Vercel. La función valida la firma y vuelve a consultar la orden directamente con Mercado Pago. El estado que ve el comprador también se consulta directamente al crear la página de retorno.

## Flujo para el comprador

- **Pago completo:** se cobra el precio vigente publicado en MXN en Mercado Pago. Se permite entrega local o envío nacional.
- **Anticipo del 50%:** se cobra la mitad exacta en Mercado Pago y la mitad restante se paga en efectivo al recibir. Esta opción solo aparece para Monterrey y área metropolitana.
- La pieza debe aparecer como `Disponible` y tener un precio mayor a cero para habilitar la compra.
- El navegador no decide el precio. La función vuelve a consultar catálogo y calcula el importe en el servidor, incluyendo la promoción de septiembre que ya aplica al Rolex y Cartier.
- La entrega estimada es de 1 a 3 días hábiles. La dirección, el horario y los detalles de envío se coordinan por WhatsApp después de confirmar el pago.

El sitio no almacena direcciones ni crea una base propia de pedidos. Mercado Pago conserva las órdenes y pagos; el comprador conserva su referencia en la página de retorno y puede compartirla con el asesor. Revisa en el panel de Mercado Pago que el monto esté acreditado antes de preparar o entregar una pieza.

## Referencias oficiales

- [Crear una order Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-orders/create-order?scope=prod)
- [Configurar notificaciones Webhook](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-orders/notifications?scope=prod)
- [Estados de una order](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-orders/payment-management/status/order-status)
- [Funciones Node.js en Vercel](https://vercel.com/docs/functions/runtimes/node-js)