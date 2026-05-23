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

/** Human-friendly one-liner shown under a rejected thumbnail. */
export const REASON_CAPTIONS: Record<RuleId, string> = {
  format:     "Unsupported format",
  dimensions: "Image too small",
  blur:       "Blurry face detected",
  similarity: "Too similar to another upload",
  faceCount:  "No clear face",
  faceSize:   "Face is too far away",
};

/**
 * Map a server image row → per-rule status array.
 *
 * The server stores rejections as `["format: Could not detect...", "blur: variance 12.4 …"]`.
 * We split each entry on the first ":" to recover the rule id and its message.
 */
export function deriveRuleStatuses(row: ImageRow): RuleResult[] {
  const status = row.status;

  if (status === "PENDING") {
    return RULE_DEFS.map((r) => ({ id: r.id, status: "pending" }));
  }
  if (status === "PROCESSING") {
    // Server runs all rules together; surface them all as in-flight.
    return RULE_DEFS.map((r) => ({ id: r.id, status: "checking" }));
  }

  // ACCEPTED or REJECTED — derive each rule's verdict from rejectionReasons.
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
    return { id: r.id, status: "pass" };
  });
}

export function primaryRejectionRule(row: ImageRow): RuleId | null {
  const rules = deriveRuleStatuses(row);
  const first = rules.find((r) => r.status === "fail");
  return first ? (first.id as RuleId) : null;
}

export function failedCount(row: ImageRow): number {
  return deriveRuleStatuses(row).filter((r) => r.status === "fail").length;
}
