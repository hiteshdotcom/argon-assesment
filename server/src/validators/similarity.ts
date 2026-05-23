import { config } from "../config";
import { prisma } from "../db";
import { computeAHash, hammingDistanceHex } from "../utils/hash";
import type { Validator } from "./types";

export const similarityValidator: Validator = {
  name: "similarity",
  async run(ctx) {
    const hash = await computeAHash(ctx.buffer);
    ctx.computed.perceptualHash = hash;

    // Compare against every accepted image. For a scaled deployment, swap to
    // a vector index (e.g., pg_trgm on hash, or a dedicated ANN store).
    const accepted = await prisma.image.findMany({
      where: {
        status: "ACCEPTED",
        perceptualHash: { not: null },
        NOT: { id: ctx.imageId },
      },
      select: { id: true, perceptualHash: true },
    });

    let closest: { id: string; distance: number } | null = null;
    for (const row of accepted) {
      if (!row.perceptualHash) continue;
      const d = hammingDistanceHex(hash, row.perceptualHash);
      if (closest === null || d < closest.distance) {
        closest = { id: row.id, distance: d };
      }
    }

    if (closest !== null && closest.distance < config.SIMILARITY_HAMMING_MAX) {
      return {
        passed: false,
        reason: `Near-duplicate of image ${closest.id} (Hamming ${closest.distance} < ${config.SIMILARITY_HAMMING_MAX})`,
        meta: { hash, closestId: closest.id, distance: closest.distance },
      };
    }
    return { passed: true, meta: { hash, closestDistance: closest?.distance ?? null } };
  },
};
