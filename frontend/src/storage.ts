// One personal profile, stored in this browser only — no accounts, no server.
// Each child uses the site on their own device/browser, so the profile is
// singular and personal.

import type { ContribSchedule } from "./calc/projection";

export interface Contribution {
  id: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  note: string;
}

export interface Profile {
  name: string;
  dob: string; // "YYYY-MM-DD"
  startingBalance: number;
  allocation: Record<string, number>; // product id -> weight (0-100)
  contributions: Contribution[];
  assumptions: ContribSchedule;
}

export interface Store {
  version: 2;
  profile: Profile;
}

const KEY = "jisa.profile.v2";
const LEGACY_KEY = "jisa.profiles.v1"; // pre-2026-08 multi-child schema

export function seedStore(): Store {
  const year = new Date().getFullYear();
  return {
    version: 2,
    profile: {
      name: "Me",
      dob: `${year - 15}-01-01`,
      startingBalance: 0,
      allocation: { "rl-mm": 40, vuag: 60 },
      contributions: [],
      assumptions: { monthly: 0, annualGift: 500, giftMonth: 12 },
    },
  };
}

function isProfileLike(p: unknown): p is Profile {
  const q = p as Profile;
  return (
    !!q &&
    typeof q.name === "string" &&
    typeof q.dob === "string" &&
    typeof q.allocation === "object"
  );
}

function normalizeProfile(p: Profile): Profile {
  return {
    name: p.name || "Me",
    dob: p.dob,
    startingBalance: Number(p.startingBalance) || 0,
    allocation: p.allocation && typeof p.allocation === "object" ? p.allocation : {},
    contributions: Array.isArray(p.contributions) ? p.contributions : [],
    assumptions: p.assumptions ?? { monthly: 0, annualGift: 0, giftMonth: 12 },
  };
}

/** Old multi-child store -> the active child's profile. */
function migrateLegacy(raw: string): Store | null {
  try {
    const old = JSON.parse(raw) as {
      version: number;
      activeProfileId?: string;
      profiles?: (Profile & { id: string })[];
    };
    if (old.version !== 1 || !Array.isArray(old.profiles) || old.profiles.length === 0) {
      return null;
    }
    const picked =
      old.profiles.find((p) => p.id === old.activeProfileId) ?? old.profiles[0];
    if (!isProfileLike(picked)) return null;
    return { version: 2, profile: normalizeProfile(picked) };
  } catch {
    return null;
  }
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed.version === 2 && isProfileLike(parsed.profile)) {
        return { version: 2, profile: normalizeProfile(parsed.profile) };
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacy(legacy);
      if (migrated) {
        saveStore(migrated);
        return migrated;
      }
    }
    return seedStore();
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

/** Parse an exported backup (v2, or a legacy v1 multi-child backup). Throws
 * with a readable message if invalid. */
export function parseImport(text: string): Store {
  const parsed = JSON.parse(text) as { version?: number };
  if (parsed.version === 1) {
    const migrated = migrateLegacy(text);
    if (!migrated) throw new Error("Old backup couldn't be read");
    return migrated;
  }
  const v2 = parsed as Store;
  if (v2.version !== 2) throw new Error("Unsupported backup version");
  if (!isProfileLike(v2.profile)) throw new Error("Backup profile is missing fields");
  return { version: 2, profile: normalizeProfile(v2.profile) };
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
