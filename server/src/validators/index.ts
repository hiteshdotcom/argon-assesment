import { formatValidator } from "./format";
import { dimensionsValidator } from "./dimensions";
import { blurValidator } from "./blur";
import { similarityValidator } from "./similarity";
import { faceCountValidator } from "./faceCount";
import { faceSizeValidator } from "./faceSize";
import type { Validator, ValidatorContext, ValidatorResult } from "./types";

/**
 * Order matters for *efficiency* (cheap checks first) but not correctness:
 * the runner does NOT short-circuit. Every validator runs, every failure is
 * collected and reported, so reviewers see the full picture in one pass.
 */
export const PIPELINE: Validator[] = [
  formatValidator,
  dimensionsValidator,
  blurValidator,
  faceCountValidator,
  faceSizeValidator,
  similarityValidator,
];

export interface PipelineReport {
  passed: boolean;
  results: Array<ValidatorResult & { name: string }>;
  rejectionReasons: string[];
  computed: ValidatorContext["computed"];
}

export async function runPipeline(ctx: ValidatorContext): Promise<PipelineReport> {
  const results: PipelineReport["results"] = [];
  for (const v of PIPELINE) {
    try {
      const r = await v.run(ctx);
      results.push({ name: v.name, ...r });
    } catch (err) {
      // A throwing validator is itself a rejection — never abort the pipeline.
      results.push({
        name: v.name,
        passed: false,
        reason: `validator threw: ${(err as Error).message}`,
      });
    }
  }
  const rejectionReasons = results
    .filter((r) => !r.passed && r.reason)
    .map((r) => `${r.name}: ${r.reason}`);
  return {
    passed: rejectionReasons.length === 0,
    results,
    rejectionReasons,
    computed: ctx.computed,
  };
}

export type { ValidatorContext, ValidatorResult, Validator };
