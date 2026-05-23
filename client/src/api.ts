const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api";

export type ImageStatus = "PENDING" | "PROCESSING" | "ACCEPTED" | "REJECTED";

export interface ImageRow {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  status: ImageStatus;
  rejectionReasons: string[] | null;
  perceptualHash: string | null;
  faceCount: number | null;
  blurScore: number | null;
  createdAt: string;
  updatedAt: string;
  previewUrl: string;
}

export async function uploadImage(file: File): Promise<{ id: string; status: ImageStatus }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/images`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function getImage(id: string): Promise<ImageRow> {
  const res = await fetch(`${BASE}/images/${id}`);
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  return res.json();
}

export async function listImages(): Promise<ImageRow[]> {
  const res = await fetch(`${BASE}/images`);
  if (!res.ok) throw new Error(`List failed (${res.status})`);
  return res.json();
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`${BASE}/images/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
}

export interface ServerConfig {
  faceModelLoaded: boolean;
  thresholds: {
    minWidth: number;
    minHeight: number;
    minFileBytes: number;
    maxUploadBytes: number;
    blurVarianceMin: number;
    similarityHammingMax: number;
    faceAreaMinRatio: number;
  };
}

export async function getConfig(): Promise<ServerConfig> {
  const res = await fetch(`${BASE}/config`);
  if (!res.ok) throw new Error(`Config fetch failed (${res.status})`);
  return res.json();
}
