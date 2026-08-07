// Per-child profiles live in localStorage only — no accounts, no server.

import type { ContribSchedule } from "./calc/projection";

export interface Contribution {
  id: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  note: string;
}

export interface Profile {
  id: string;
  name: string;
  dob: string; // "YYYY-MM-DD"
  startingBalance: number;
  allocation: Record<string, number>; // product id -> weight (0-100)
  contributions: Contribution[];
  assumptions: ContribSchedule;
}

export interface Store {
  version: 1;
  activeProfileId: string;
  profiles: Profile[];
}

const KEY = "jisa.profiles.v1";

/** Two editable starter profiles matching "a 15yo and a 13yo" (dobs are
 * placeholders — the Plan section nudges you to set real ones). */
export function seedStore(): Store {
  const year = new Date().getFullYear();
  return {
    version: 1,
    activeProfileId: "child-1",
    profiles: [
      {
        id: "child-1",
        name: "Child 1",
        dob: `${year - 15}-01-01`,
        startingBalance: 0,
        allocation: { "rl-mm": 40, vuag: 60 },
        contributions: [],
        assumptions: { monthly: 0, annualGift: 500, giftMonth: 12 },
      },
      {
        id: "child-2",
        name: "Child 2",
        dob: `${year - 13}-01-01`,
        startingBalance: 0,
        allocation: { "rl-mm": 40, vuag: 60 },
        contributions: [],
        assumptions: { monthly: 0, annualGift: 500, giftMonth: 12 },
      },
    ],
  };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedStore();
    const parsed = JSON.parse(raw) as Store;
    if (parsed.version !== 1 || !Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
      return seedStore();
    }
    return parsed;
  } catch {
    return seedStore();
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Storage full/blocked — the app still works, it just won't persist.
  }
}

export function exportStore(store: Store): void {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `jisa-backup-${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse an exported backup. Throws with a readable message if invalid. */
export function parseImport(text: string): Store {
  const parsed = JSON.parse(text) as Store;
  if (parsed.version !== 1) throw new Error("Unsupported backup version");
  if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
    throw new Error("Backup contains no profiles");
  }
  for (const p of parsed.profiles) {
    if (typeof p.id !== "string" || typeof p.name !== "string" || typeof p.dob !== "string") {
      throw new Error("Backup profile is missing fields");
    }
    p.contributions = Array.isArray(p.contributions) ? p.contributions : [];
    p.allocation = p.allocation && typeof p.allocation === "object" ? p.allocation : {};
    p.startingBalance = Number(p.startingBalance) || 0;
    p.assumptions = p.assumptions ?? { monthly: 0, annualGift: 0, giftMonth: 12 };
  }
  if (!parsed.profiles.some((p) => p.id === parsed.activeProfileId)) {
    parsed.activeProfileId = parsed.profiles[0].id;
  }
  return parsed;
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
