import type { Context } from "@netlify/functions";
import Stripe from "stripe";

// Stripe Checkout session creation
// Creates a one-time payment session for Pro upgrade
// Env vars needed: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL

export default async (req: Request, _context: Context) => {
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  const stripeKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const priceId = Netlify.env.get("STRIPE_PRICE_ID");
  const siteUrl = Netlify.env.get("SITE_URL") || "https://your-site.netlify.app";

  if (!stripeKey || !priceId) {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID." }),
      { status: 500, headers }
    );
  }

  try {
    const body = await req.json();
    const { uid, email } = body;

    if (!uid) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" as any });

    // Create a checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Pass user ID in metadata for webhook to identify the user
      metadata: {
        firebaseUid: uid,
      },
      customer_email: email || undefined,
      success_url: `${siteUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}?payment=cancelled`,
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create checkout session" }),
      { status: 500, headers }
    );
  }
};
