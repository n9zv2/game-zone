// ============================================================
// Salfa (Spyfall) Game Data — "مين برا السالفة"
// 500+ Arabic words across 25+ categories — loaded from JSON
// ============================================================

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SALFA_WORDS = JSON.parse(
  readFileSync(join(__dirname, "salfaWords.json"), "utf-8")
);

// ============================================================
// Spy count based on player count (automatic)
// ============================================================
export function getSpyCount(playerCount) {
  if (playerCount >= 8) return 2;
  return 1;
}
