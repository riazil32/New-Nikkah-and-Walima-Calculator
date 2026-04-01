import type { Context } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

export default async (req: Request, context: Context) => {
  // Only allow POST requests
  if (req.method !== "POST") {
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

  try {
    const body = await req.json();
    const { budget, guests } = body;

    if (!budget || !guests) {
      return new Response(JSON.stringify({ error: "Missing budget or guests" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `I am planning an Islamic wedding (Nikkah/Walima) with a budget of £${budget} for ${guests} guests. 
      Provide a short, inspiring, and practical piece of advice (max 3 sentences) focusing on 'Barakah' (blessings), simplicity, and meaningful spending for a blessed union.`,
    });

    return new Response(JSON.stringify({ tip: response.text || "" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
