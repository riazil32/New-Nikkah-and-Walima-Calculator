import type { Context } from "@netlify/functions";
import Stripe from "stripe";

// Stripe webhook handler
// Listens for checkout.session.completed to mark users as Pro
// Env vars needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//
// To set up:
// 1. In Stripe Dashboard > Developers > Webhooks, add endpoint:
//    https://your-site.netlify.app/.netlify/functions/stripe-webhook
// 2. Select event: checkout.session.completed
// 3. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET env var

export default async (req: Request, _context: Context) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  const stripeKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    return new Response(
      JSON.stringify({ error: "Stripe not configured" }),
      { status: 500, headers }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" as any });

  let event: Stripe.Event;

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe signature" }),
        { status: 400, headers }
      );
    }

    try {
      const body = await req.text();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers }
      );
    }
  } else {
    // No webhook secret — parse body directly (development mode)
    try {
      const body = await req.json();
      event = body as Stripe.Event;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers }
      );
    }
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const firebaseUid = session.metadata?.firebaseUid;

      if (firebaseUid) {
        // In a production app, you would update Firestore here:
        // import { initializeApp, cert } from 'firebase-admin/app';
        // import { getFirestore } from 'firebase-admin/firestore';
        // await db.doc(`users/${firebaseUid}`).set({ isPro: true, proSince: new Date() }, { merge: true });

        console.log(`✅ Pro upgrade successful for user: ${firebaseUid}`);
        console.log(`   Payment: ${session.amount_total ? (session.amount_total / 100).toFixed(2) : 'unknown'} ${session.currency?.toUpperCase()}`);
        console.log(`   Email: ${session.customer_email || 'N/A'}`);

        // For now, log the upgrade. The client-side will handle the pro status
        // via the success URL redirect with session_id
      } else {
        console.warn("⚠️ Checkout completed but no Firebase UID in metadata");
      }
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers,
  });
};
