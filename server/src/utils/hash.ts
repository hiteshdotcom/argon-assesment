import sharp from "sharp";

/**
 * Average hash (aHash): resize to 8x8 grayscale, threshold each pixel against
 * the mean, return a 64-bit fingerprint as a hex string.
 *
 * Cheap, fast, robust to compression — close (low Hamming distance) hashes
 * indicate near-duplicate images.
 */
export async function computeAHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length;

  const bits = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) bits[i] = data[i] >= mean ? 1 : 0;

  // Pack 64 bits into a 16-char hex string.
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) {
    throw new Error(`hash length mismatch: ${a.length} vs ${b.length}`);
  }
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    // popcount of a 4-bit nibble
    dist += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][xor];
  }
  return dist;
}
