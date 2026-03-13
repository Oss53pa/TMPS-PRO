import { SUPABASE_URL, SUPABASE_KEY } from "../constants";

const isSupabaseConfigured = !SUPABASE_URL.includes("your-project");

// ── localStorage ──
export const local = {
  save(key: string, data: unknown) {
    try {
      localStorage.setItem(`tms_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn("localStorage save error:", e);
    }
  },
  load<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`tms_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};

// ── Supabase (only used if configured) ──
export const sb = {
  async upsert(table: string, rows: unknown[]) {
    if (!isSupabaseConfigured) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(rows),
      });
    } catch (e: any) {
      console.warn("Supabase:", e.message);
    }
  },
  async select(table: string) {
    if (!isSupabaseConfigured) return [];
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      return r.ok ? r.json() : [];
    } catch {
      return [];
    }
  },
  async delete(table: string, id: string | number) {
    if (!isSupabaseConfigured) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
    } catch (e: any) {
      console.warn("Supabase:", e.message);
    }
  },
};
