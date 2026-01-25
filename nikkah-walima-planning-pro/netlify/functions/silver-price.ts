import type { Context } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

export default async (req: Request, context: Context) => {
  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get currency from query params, default to GBP
  const url = new URL(req.url);
  const currency = url.searchParams.get("currency") || "GBP";
  const currencyNames: Record<string, string> = {
    GBP: "British Pounds",
    USD: "US Dollars",
    EUR: "Euros",
    AED: "UAE Dirhams",
    PKR: "Pakistani Rupees",
    INR: "Indian Rupees",
    SAR: "Saudi Riyals",
    MYR: "Malaysian Ringgit",
    CAD: "Canadian Dollars",
    AUD: "Australian Dollars",
  };

  const currencyName = currencyNames[currency] || currency;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `What is the current market price of silver per gram in ${currencyName} (${currency})? Please provide just the numeric value in your response text, and the sources in grounding metadata.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const match = text.match(/(\d+(?:[.,]\d+)?)/);
    const price = match ? parseFloat(match[1].replace(",", ".")) : null;

    // Extract sources from grounding metadata
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = chunks
      ? chunks
          .filter((c: any) => c.web)
          .map((c: any) => ({ title: c.web.title, uri: c.web.uri }))
      : [];

    return new Response(
      JSON.stringify({
        price,
        currency,
        sources,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Silver price fetch error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch silver price" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
