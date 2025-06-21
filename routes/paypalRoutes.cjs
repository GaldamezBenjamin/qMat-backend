const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const admin = require("firebase-admin");
const { verifyToken } = require('../middleware/authMiddleware.cjs');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Obtener access_token
async function getAccessToken() {
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal token error: ${error}`);
  }
  const data = await response.json();
  return data.access_token;
}

// Crear producto
router.post('/create-product', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: "Suscripción mensual qMática",
        description: "Acceso mensual a qMática",
        type: "SERVICE",
        category: "SOFTWARE"
      })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-plan', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const { product_id } = req.body; // Debes enviar el product_id creado antes

    const response = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        product_id,
        name: "Suscripción mensual qMática",
        description: "Acceso mensual a qMática",
        billing_cycles: [
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0, // 0 = infinito
            pricing_scheme: { fixed_price: { value: "2.50", currency_code: "USD" } }
          }
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 1
        }
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-subscription', verifyToken, async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const { plan_id } = req.body; // Debes enviar el plan_id creado antes
    const uid = req.user.uid;

    const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        plan_id,
        application_context: {
          brand_name: "qMática",
          user_action: "SUBSCRIBE_NOW",
          return_url: "http://localhost:5173/paypal-success",
          cancel_url: "http://localhost:5173/paypal-cancel"
        }
      })
    });
    const data = await response.json();

    if (!response.ok) {
      console.error("PayPal error:", data);
      return res.status(response.status).json(data);
    }

    await admin.firestore().collection('usuarios').doc(uid).update({
      'suscripcion.paypal_subscription_id': data.id
    });

    res.json(data); // Incluye el link de aprobación para el frontend
  } catch (err) {
    console.error("Error en /create-subscription:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhook', express.json(), async (req, res) => {
  const event = req.body;

  try {
    if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscriptionId = event.resource.id;

      const userSnap = await admin.firestore()
        .collection('usuarios')
        .where('suscripcion.paypal_subscription_id', '==', subscriptionId)
        .limit(1)
        .get();

      if (!userSnap.empty) {
        const userRef = userSnap.docs[0].ref;
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setMonth(fechaFin.getMonth() + 1);

        await userRef.update({
          'suscripcion.suscrito': true,
          'suscripcion.fecha_inicio': admin.firestore.Timestamp.fromDate(fechaInicio),
          'suscripcion.fecha_fin': admin.firestore.Timestamp.fromDate(fechaFin)
        });

      } else {
        console.warn(`Usuario con paypal_subscription_id ${subscriptionId} no encontrado`);
      }
    }

    // Renovación de pago exitoso (puedes actualizar la fecha de fin)
    if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
      const subscriptionId = event.resource.billing_agreement_id;
      const userSnap = await admin.firestore()
        .collection('usuarios')
        .where('suscripcion.paypal_subscription_id', '==', subscriptionId)
        .limit(1)
        .get();

      if (!userSnap.empty) {
        const userRef = userSnap.docs[0].ref;
        // Extiende la fecha de fin un mes más
        const userData = userSnap.docs[0].data();
        let fechaFin = userData.suscripcion?.fecha_fin?.toDate?.() || new Date();
        fechaFin.setMonth(fechaFin.getMonth() + 1);

        await userRef.update({
          'suscripcion.suscrito': true,
          'suscripcion.fecha_fin': admin.firestore.Timestamp.fromDate(fechaFin)
        });
      }
    }

    // Cancelación de suscripción
    if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const subscriptionId = event.resource.id;
      const userSnap = await admin.firestore()
        .collection('usuarios')
        .where('suscripcion.paypal_subscription_id', '==', subscriptionId)
        .limit(1)
        .get();

      if (!userSnap.empty) {
        const userRef = userSnap.docs[0].ref;
        await userRef.update({
          'suscripcion.suscrito': false
        });
      }
    }
  } catch (err) {
    console.error("Error en webhook PayPal:", err);
  }

  res.sendStatus(200);
});

// Verifica si la suscripción está activa para el usuario o subscription_id
router.get('/verify-subscription', async (req, res) => {
  const { subscription_id } = req.query;
  if (!subscription_id) {
    return res.status(400).json({ error: "Falta subscription_id" });
  }

  try {
    // Busca el usuario que tenga ese paypal_subscription_id
    const userSnap = await admin.firestore()
      .collection('usuarios')
      .where('suscripcion.paypal_subscription_id', '==', subscription_id)
      .limit(1)
      .get();

    if (!userSnap.empty) {
      const userData = userSnap.docs[0].data();
      if (userData.suscripcion?.suscrito) {
        return res.json({ success: true });
      }
    }
    // Si no está activo aún
    return res.status(404).json({ error: "Suscripción no activa" });
  } catch (err) {
    console.error("Error en /verify-subscription:", err);
    return res.status(500).json({ error: "Error verificando suscripción" });
  }
});

// Cancela la suscripción de PayPal y actualiza el usuario
router.post('/cancel-subscription', verifyToken, async (req, res) => {
  const uid = req.user.uid;
  try {
    // Busca el usuario y obtiene el paypal_subscription_id
    const userDoc = await admin.firestore().collection('usuarios').doc(uid).get();
    const userData = userDoc.data();
    const subscriptionId = userData?.suscripcion?.paypal_subscription_id;

    if (!subscriptionId) {
      return res.status(400).json({ error: "No hay suscripción activa para cancelar." });
    }

    // Obtiene el access_token de PayPal
    const accessToken = await getAccessToken();

    // Llama a la API de PayPal para cancelar la suscripción
    const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ reason: "Cancelación solicitada por el usuario" })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(500).json({ error: errorData });
    }

    // Actualiza el usuario en Firestore
    await admin.firestore().collection('usuarios').doc(uid).update({
      'suscripcion.suscrito': false,
      'suscripcion.fecha_inicio': null,
      'suscripcion.fecha_fin': null,
      'paypal_subscription_id': null
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error cancelando suscripción:", err);
    res.status(500).json({ error: "Error cancelando suscripción" });
  }
});

module.exports = router;