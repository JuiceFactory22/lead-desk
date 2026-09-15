// Understands whether a contractor's reply means "give me the lead"
// or "not for me" based on actual intent, not exact wording -- so
// "all right", "sounds good, thanks", "nah I'm good", etc. all work
// without needing to predict every possible phrasing in advance.

export type Intent = "redeem" | "decline" | "unclear";

// A business SMS number generally isn't iMessage-enabled, so when a
// contractor taps a thumbs-up (or any tapback) on a text from it,
// Apple converts the reaction into a plain text message like
// `Liked "Hey, it's Krystelle!..."` -- catch this deterministically,
// no AI call needed.
const TAPBACK_PATTERN = /^(loved|liked|disliked|laughed at|emphasized|questioned)\s+["“]/i;

export async function detectIntent(body: string): Promise<Intent> {
  const trimmed = body.trim();
  if (!trimmed) return "unclear";

  const tapbackMatch = trimmed.match(TAPBACK_PATTERN);
  if (tapbackMatch) {
    const reaction = tapbackMatch[1].toLowerCase();
    if (reaction === "loved" || reaction === "liked" || reaction === "emphasized") return "redeem";
    if (reaction === "disliked") return "decline";
    return "unclear"; // "laughed at" or "questioned" -- genuinely ambiguous
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return "unclear";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5,
        messages: [
          {
            role: "user",
            content: `A contractor was texted about a home-service lead and asked to reply if they want it, or to pass if not. Their reply: "${trimmed}"\n\nClassify their intent as exactly one word: REDEEM (they want it / are interested / agreeing), DECLINE (they're passing / not interested), or UNCLEAR (can't tell, or it's an unrelated message). Respond with only that one word.`,
          },
        ],
      }),
    });
    const data = await res.json();
    const text = (data.content?.[0]?.text || "").trim().toUpperCase();
    if (text.startsWith("REDEEM")) return "redeem";
    if (text.startsWith("DECLINE")) return "decline";
    return "unclear";
  } catch {
    return "unclear";
  }
}
