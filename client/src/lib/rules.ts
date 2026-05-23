import type { ImageRow } from "../api";

/**
 * The six validators run by the server pipeline, in the order they execute.
 * `id` matches the validator name on the server (validators/<id>.ts).
 */
export const RULE_DEFS = [
  { id: "format",     name: "Format",     short: "Format",    desc: "JPEG, PNG, HEIC",    icon: "file-image" as const },
  { id: "dimensions", name: "Dimensions", short: "Size",      desc: "≥ 512×512, ≥ 20KB",  icon: "maximize-2" as const },
  { id: "blur",       name: "Sharpness",  short: "Sharpness", desc: "Laplacian variance", icon: "focus"      as const },
  { id: "similarity", name: "Uniqueness", short: "Unique",    desc: "aHash distance",     icon: "copy"       as const },
  { id: "faceCount",  name: "Face count", short: "Face",      desc: "Exactly one face",   icon: "user"       as const },
  { id: "faceSize",   name: "Face size",  short: "Framing",   desc: "Face / image area",  icon: "scan-face"  as const },
] as const;

export type RuleId = (typeof RULE_DEFS)[number]["id"];
export type RuleStatus = "pending" | "checking" | "pass" | "fail" | "skipped";

export interface RuleResult {
  id: RuleId;
  status: RuleStatus;
  message?: string;
}

/** Rules that depend on the face-api model. Skip if model isn't loaded. */
const FACE_RULES = new Set<RuleId>(["faceCount", "faceSize"]);

/**
 * Headline shown under a rejected thumbnail. Kept short — details belong in the
 * Inspector. `friendlyCaption()` below picks something more specific when the
 * server's message includes numbers we can surface.
 */
export const REASON_CAPTIONS: Record<RuleId, string> = {
  format:     "Unsupported format",
  dimensions: "Image too small",
  blur:       "Image is blurry",
  similarity: "Too similar to another upload",
  faceCount:  "Face count is off",
  faceSize:   "Face is too far away",
};

/**
 * Map a server image row → per-rule status array.
 *
 * Server stores rejections as `"format: Could not detect..."` etc. We parse on
 * the first ":" to recover the rule id and its specific message.
 *
 * If `faceModelLoaded` is false, faceCount/faceSize couldn't have run on the
 * server — they're surfaced as "skipped" instead of pretending they passed.
 */
export function deriveRuleStatuses(
  row: ImageRow,
  opts: { faceModelLoaded?: boolean } = {},
): RuleResult[] {
  const status = row.status;
  const faceModelLoaded = opts.faceModelLoaded ?? true;

  if (status === "PENDING") {
    return RULE_DEFS.map((r) => ({ id: r.id, status: "pending" }));
  }
  if (status === "PROCESSING") {
    return RULE_DEFS.map((r) => ({ id: r.id, status: "checking" }));
  }

  const reasons = Array.isArray(row.rejectionReasons) ? row.rejectionReasons : [];
  const failMap = new Map<string, string>();
  for (const entry of reasons) {
    const idx = entry.indexOf(":");
    if (idx > 0) {
      failMap.set(entry.slice(0, idx).trim(), entry.slice(idx + 1).trim());
    }
  }

  return RULE_DEFS.map((r) => {
    if (failMap.has(r.id)) {
      return { id: r.id, status: "fail", message: failMap.get(r.id) };
    }
    if (!faceModelLoaded && FACE_RULES.has(r.id as RuleId)) {
      return {
        id: r.id,
        status: "skipped",
        message: "Skipped — face-api model not installed on the server.",
      };
    }
    return { id: r.id, status: "pass" };
  });
}

/**
 * Pick the most informative caption for a rejected tile. Prefers the server's
 * specific message (e.g. "height 153px < 256px") over the generic phrase.
 */
export function friendlyCaption(rule: RuleResult): { headline: string; detail?: string } {
  const id = rule.id as RuleId;
  const headline = REASON_CAPTIONS[id] ?? "Did not pass review";
  if (!rule.message) return { headline };

  // Per-rule shaping — turn raw validator text into a one-liner.
  let detail: string | undefined = rule.message;

  if (id === "dimensions") {
    // Server text: "file too small: 1234B < 5120B; width 100px < 256px; height 153px < 256px"
    // Strip semicolons → "; " so it reads like one sentence.
    detail = rule.message.replace(/;\s*/g, " · ");
  } else if (id === "faceCount") {
    // Server text: "Expected exactly 1 face, found 2"
    const m = rule.message.match(/found\s+(\d+)/i);
    if (m) {
      const n = Number(m[1]);
      detail = n === 0 ? "No face detected" : `${n} faces detected — needs exactly 1`;
    }
  } else if (id === "blur") {
    const m = rule.message.match(/variance\s+([\d.]+)/i);
    if (m) detail = `Sharpness ${m[1]} — too soft for a portrait`;
  } else if (id === "similarity") {
    const m = rule.message.match(/Hamming\s+(\d+)/i);
    if (m) detail = `Looks like another upload (Hamming ${m[1]})`;
  }
  return { headline, detail };
}

export function primaryRejectionRule(
  row: ImageRow,
  opts?: { faceModelLoaded?: boolean },
): RuleResult | null {
  const rules = deriveRuleStatuses(row, opts);
  return rules.find((r) => r.status === "fail") ?? null;
}

export function failedRules(
  row: ImageRow,
  opts?: { faceModelLoaded?: boolean },
): RuleResult[] {
  return deriveRuleStatuses(row, opts).filter((r) => r.status === "fail");
}
