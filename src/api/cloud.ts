// ✅ Lecture propre de l'environnement Vite
const env = (import.meta as any).env as Record<string, string | undefined>;

const API_BASE = (env.VITE_MYTRIP_API_BASE ?? "https://mytrip-api.amirsfr38.workers.dev").replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// 📸 PHOTO (Unsplash via Worker)
// ─────────────────────────────────────────────────────────────────────────────
export type PhotoResult =
  | { ok: true; photoUrl: string; query: string; credit?: { name?: string; username?: string; link?: string } }
  | { ok: false; photoUrl: null; reason?: string };

export const fetchTripPhoto = async (params: {
  city?: string;
  country?: string;
  capital?: string;
}): Promise<PhotoResult> => {
  try {
    const url = new URL(API_BASE + "/photo");
    if (params.city) url.searchParams.set("city", params.city);
    if (params.country) url.searchParams.set("country", params.country);
    if (params.capital) url.searchParams.set("capital", params.capital);

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[fetchTripPhoto] HTTP ${res.status}`);
      return { ok: false, photoUrl: null, reason: `http_${res.status}` };
    }
    
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[fetchTripPhoto] Error:", err);
    return { ok: false, photoUrl: null, reason: "network_error" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 ASSISTANT IA (Groq via Worker)
// ─────────────────────────────────────────────────────────────────────────────
export type AssistantPayload = {
  city: string;
  country: string;
  days?: number | null;
  budget?: number | null;
  currency?: string;
  style?: string;
};

export type AssistantResult =
  | {
      ok: true;
      checklist: string[];
      tips: { title: string; body: string }[];
      stepSuggestions: string[];
    }
  | { ok: false; error: string; status?: number; details?: string };

export const fetchAssistant = async (payload: AssistantPayload): Promise<AssistantResult> => {
  try {
    const res = await fetch(API_BASE + "/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[fetchAssistant] HTTP ${res.status}:`, text);
      return { ok: false, error: "assistant_failed", status: res.status, details: text };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[fetchAssistant] Error:", err);
    return { ok: false, error: "network_error" };
  }
};