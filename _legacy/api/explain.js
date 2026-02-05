/*!
 * Copyright (c) 2025 [TON ORGANISATION]
 * SPDX-License-Identifier: LicenseRef-SA-NC-1.0
 */
// api/explain.js
import OpenAI from "openai";

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const { text, question, lang, region } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "No text" }), { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const userLang = (lang || "en").toLowerCase();
    const userRegion = (region || "").trim();

    const sys = `You are DocuMate, a helpful assistant that explains documents in plain language.
- Write in ${userLang}.
- Be concise, structured, and neutral.
- If a region/jurisdiction is provided ("${userRegion}"), interpret using that local administrative or legal context; if uncertain, clearly say that specifics may vary by location and advise checking official sources.
- Emphasize key points, obligations, deadlines, fees, risks, and rights when relevant.
- If the user asked a question, answer it directly first, then provide context.
- Add a short "In short:" recap at the end.
- Important: AI can make mistakes; include a one-line notice near the end saying "AI may be inaccurate; verify important details."
- You are NOT a lawyer; include a one-line disclaimer: "This is not legal advice."`;

    const userPrompt = question
      ? `Document or excerpt:\n"""\n${text}\n"""\n\nUser question:\n${question}\n\nRegion/jurisdiction: ${userRegion || "not specified"}\nExplain in plain language for a non-expert.`
      : `Explain the following document or excerpt in plain language for a non-expert:\n"""\n${text}\n"""\nRegion/jurisdiction: ${userRegion || "not specified"}`;

    const model = process.env.DOCUMATE_MODEL || "gpt-4o-mini";

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userPrompt }
      ],
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ answer }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), { status: 500 });
  }
}

