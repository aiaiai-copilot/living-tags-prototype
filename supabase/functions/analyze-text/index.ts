import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.14.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Hello from Functions!");

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { text, availableTags } = await req.json();

        if (!text || !availableTags) {
            throw new Error("Missing text or availableTags");
        }

        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!apiKey) {
            throw new Error("Missing ANTHROPIC_API_KEY");
        }

        const anthropic = new Anthropic({
            apiKey: apiKey,
        });

        const tagsListFormatted = availableTags
            .map((tag: any) => `- ID: ${tag.id}, Name: ${tag.name}`)
            .join("\n");

        const userPrompt = `Analyze the following Russian joke/anecdote and assign relevant semantic tags from the provided list.

TEXT TO ANALYZE:
"""
${text}
"""

AVAILABLE TAGS:
${tagsListFormatted}

INSTRUCTIONS:
1. FIRST, scan for EXPLICIT MENTIONS of names, places, or keywords in the text
   - If a tag name appears directly in the text, it MUST be included with confidence 0.95-1.0
   - Example: If text contains "Вовочка", the tag "Вовочка" must be assigned

2. SECOND, identify thematic and semantic connections:
   - Strong thematic connection: 0.7-0.9
   - Moderate relevance: 0.5-0.6
   - Weak but present connection: 0.3-0.4

3. Only include tags with confidence > 0.3
4. Select a maximum of 5-7 most relevant tags
5. Return ONLY valid JSON (no markdown, no explanation)

RESPONSE FORMAT (JSON array):
[
  {
    "id": "tag-id-here",
    "name": "Tag Name",
    "confidence": 0.95,
    "reasoning": "Brief explanation (optional)"
  }
]

Return the JSON array now:`;

        const msg = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            system:
                "You are an expert at analyzing Russian humor and assigning semantic tags. You understand the cultural context, references, and themes common in Russian jokes and anecdotes. Always respond with valid JSON only.",
            messages: [
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
        });

        const content = msg.content[0];
        if (content.type !== "text") {
            throw new Error("Unexpected response format from Claude API");
        }

        let jsonText = content.text.trim();
        // Clean up markdown if present
        if (jsonText.startsWith("```")) {
            const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match && match[1]) {
                jsonText = match[1].trim();
            }
        }

        // Normalize quotes
        jsonText = jsonText
            .replace(/[\u201C\u201D]/g, '\\"')
            .replace(/[\u2018\u2019]/g, "'");

        const parsedResponse = JSON.parse(jsonText);

        return new Response(JSON.stringify(parsedResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
