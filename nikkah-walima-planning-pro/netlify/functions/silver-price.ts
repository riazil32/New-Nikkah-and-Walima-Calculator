import type { Context } from "@netlify/functions";

// GoldAPI.io - Reliable metal prices API
// Free tier: 300 requests/month
// XAG = Silver (ISO 4217 code)

const TROY_OZ_TO_GRAMS = 31.1035;

export default async (req: Request, context: Context) => {
  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Netlify.env.get("GOLDAPI_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GOLDAPI_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get currency from query params, default to GBP
  const url = new URL(req.url);
  const currency = url.searchParams.get("currency") || "GBP";
  
  // Supported currencies by GoldAPI
  const supportedCurrencies = ["USD", "GBP", "EUR", "AUD", "CAD", "CHF", "JPY", "INR", "SGD", "AED", "SAR", "MYR", "PKR"];
  const targetCurrency = supportedCurrencies.includes(currency) ? currency : "GBP";

  try {
    // Fetch silver price from GoldAPI.io
    // XAG = Silver in ISO 4217
    const response = await fetch(`https://www.goldapi.io/api/XAG/${targetCurrency}`, {
      headers: {
        "x-access-token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GoldAPI error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `GoldAPI error: ${response.status}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // GoldAPI returns price per troy ounce
    // Convert to price per gram: price / 31.1035
    const pricePerOz = data.price;
    const pricePerGram = pricePerOz ? pricePerOz / TROY_OZ_TO_GRAMS : null;

    return new Response(
      JSON.stringify({
        price: pricePerGram ? Math.round(pricePerGram * 100) / 100 : null, // Round to 2 decimal places
        pricePerOz: pricePerOz,
        currency: targetCurrency,
        metal: "Silver (XAG)",
        source: "GoldAPI.io",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Silver price fetch error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch silver price from GoldAPI" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
