// Supabase Edge Function: ai-swot
// Deploy with: supabase functions deploy ai-swot
//
// Required Supabase Secrets (set via CLI, never in code):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Directory structure for deployment:
//   supabase/functions/ai-swot/index.ts  (this file)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify the user is authenticated via the Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ error: "AI service not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { teamData } = await req.json();
    const teamName = teamData?.name || "Unknown Team";
    const td = teamData?.team_data || {};

    // Build a context string from the scouting data
    const context = [
      td.playingIdentity && `Playing Identity: ${td.playingIdentity}`,
      td.strengthsTop3 && `Strengths: ${td.strengthsTop3}`,
      td.vulnerabilitiesTop3 && `Vulnerabilities: ${td.vulnerabilitiesTop3}`,
      td.defensiveFormation && `Defensive Formation: ${td.defensiveFormation}`,
      td.pressTriggers && `Press Triggers: ${td.pressTriggers}`,
      td.buildUpPattern && `Build-Up Pattern: ${td.buildUpPattern}`,
      td.attackTransition && `Attack Transition: ${td.attackTransition}`,
      td.dangerousZones && `Dangerous Zones: ${td.dangerousZones}`,
      td.setPieceAttack && `Set Piece Attack: ${td.setPieceAttack}`,
      td.setPieceDefence && `Set Piece Defence: ${td.setPieceDefence}`,
      td.keyAttackingPlayers &&
        `Key Attacking Players: ${td.keyAttackingPlayers}`,
      td.transitionLosingPossession &&
        `Transition (losing possession): ${td.transitionLosingPossession}`,
      td.defensiveBlock && `Defensive Block: ${td.defensiveBlock}`,
    ]
      .filter(Boolean)
      .join("\n");

    const threats = (td.threats || [])
      .filter((t: { title: string }) => t.title)
      .map(
        (t: { title: string; description: string }, i: number) =>
          `Threat ${i + 1}: ${t.title} — ${t.description}`
      )
      .join("\n");

    const prompt = `You are a hockey (field hockey) performance analyst for the New Zealand Black Sticks Men's team. Based on the following scouting data for ${teamName}, generate a concise SWOT analysis and executive briefing for the coaching staff.

Focus on actionable, game-day relevant insights. Be direct and specific.

SCOUTING DATA:
${context}

${threats ? `KEY THREATS:\n${threats}` : ""}

Format your response exactly as:

STRENGTHS:
- [bullet points]

WEAKNESSES:
- [bullet points]

OPPORTUNITIES FOR NZ:
- [bullet points — how New Zealand can exploit this opponent]

THREATS TO NZ:
- [bullet points — what NZ must be wary of]

EXECUTIVE SUMMARY:
[2-3 sentences summarising the key tactical takeaway for the coaching staff]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${err}`);
    }

    const aiResult = await response.json();
    const briefing = aiResult.content[0].text;

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
