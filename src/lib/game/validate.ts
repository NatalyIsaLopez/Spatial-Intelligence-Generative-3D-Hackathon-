import type { SolutionDef } from "./types";

export interface ValidationResult {
  ok: boolean;
  /** The accepted keyword that matched, when ok is true. */
  matched?: string;
  /** Why the sketch was turned away, when ok is false. Shown to the player. */
  reason?: string;
}

/**
 * Lowercase, strip punctuation, collapse whitespace. Keeps digits so prompts
 * like "3 planks" still match on "planks".
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whole-word phrase match. "bridge" matches "a wooden bridge" but not
 * "bridgework"; "rope ladder" matches only when both words are adjacent.
 */
function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase);
  if (!needle) return false;
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(needle)}(?:\\s|$)`);
  return pattern.test(haystack);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Does this prompt solve the obstacle?
 *
 * Order matters. Accepted words win over near misses, so "a bridge with a
 * boat tied under it" passes on level 1 rather than getting the boat hint.
 */
export function validateSketch(prompt: string, solution: SolutionDef): ValidationResult {
  const text = normalize(prompt);

  if (!text) {
    return { ok: false, reason: "Sketch something first." };
  }

  for (const term of solution.accept) {
    if (containsPhrase(text, term)) {
      return { ok: true, matched: term };
    }
  }

  for (const miss of solution.nearMisses) {
    if (containsPhrase(text, miss.term)) {
      return { ok: false, reason: miss.hint };
    }
  }

  return { ok: false, reason: solution.hint };
}
