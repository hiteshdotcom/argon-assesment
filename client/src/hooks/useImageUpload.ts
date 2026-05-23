import { useCallback, useEffect, useRef, useState } from "react";
import { deleteImage, getImage, listImages, uploadImage, type ImageRow, type ImageStatus } from "../api";

const ALLOWED_EXT = /\.(jpe?g|png|heic|heif)$/i;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export interface PendingItem {
  localId: string;
  file: File;
  previewUrl: string;
  status: "validating" | "uploading" | "processing" | "accepted" | "rejected" | "error";
  serverId?: string;
  error?: string;
  row?: ImageRow;
}

function clientValidate(file: File): string | null {
  // Belt-and-suspenders: server still validates magic bytes — this is just UX.
  if (!ALLOWED_EXT.test(file.name) && !ALLOWED_MIME.has(file.type)) {
    return "Unsupported file type (allow JPEG, PNG, HEIC)";
  }
  return null;
}

const TERMINAL: ReadonlyArray<ImageStatus> = ["ACCEPTED", "REJECTED"];

export function useImageUpload() {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [accepted, setAccepted] = useState<ImageRow[]>([]);
  const [rejected, setRejected] = useState<ImageRow[]>([]);
  const pollers = useRef(new Map<string, number>());

  const refreshLists = useCallback(async () => {
    const rows = await listImages().catch(() => [] as ImageRow[]);
    setAccepted(rows.filter((r) => r.status === "ACCEPTED"));
    setRejected(rows.filter((r) => r.status === "REJECTED"));
  }, []);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  const stopPolling = useCallback((localId: string) => {
    const handle = pollers.current.get(localId);
    if (handle !== undefined) {
      window.clearInterval(handle);
      pollers.current.delete(localId);
    }
  }, []);

  const startPolling = useCallback(
    (localId: string, serverId: string) => {
      const handle = window.setInterval(async () => {
        try {
          const row = await getImage(serverId);
          setPending((prev) =>
            prev.map((p) =>
              p.localId === localId
                ? {
                    ...p,
                    row,
                    status:
                      row.status === "ACCEPTED"
                        ? "accepted"
                        : row.status === "REJECTED"
                          ? "rejected"
                          : row.status === "PROCESSING"
                            ? "processing"
                            : p.status,
                  }
                : p,
            ),
          );
          if (TERMINAL.includes(row.status)) {
            stopPolling(localId);
            refreshLists();
          }
        } catch (err) {
          console.warn("poll error", err);
        }
      }, 1500);
      pollers.current.set(localId, handle);
    },
    [refreshLists, stopPolling],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const next: PendingItem[] = [];
      for (const file of Array.from(files)) {
        const localId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);
        const validationError = clientValidate(file);
        next.push({
          localId,
          file,
          previewUrl,
          status: validationError ? "error" : "uploading",
          error: validationError ?? undefined,
        });
      }
      setPending((prev) => [...next, ...prev]);

      for (const item of next) {
        if (item.status === "error") continue;
        try {
          const { id } = await uploadImage(item.file);
          setPending((prev) =>
            prev.map((p) =>
              p.localId === item.localId
                ? { ...p, status: "processing", serverId: id }
                : p,
            ),
          );
          startPolling(item.localId, id);
        } catch (err) {
          setPending((prev) =>
            prev.map((p) =>
              p.localId === item.localId
                ? { ...p, status: "error", error: (err as Error).message }
                : p,
            ),
          );
        }
      }
    },
    [startPolling],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteImage(id);
      refreshLists();
      setPending((prev) =>
        prev.filter((p) => p.serverId !== id && p.row?.id !== id),
      );
    },
    [refreshLists],
  );

  // Cleanup object URLs and intervals on unmount.
  useEffect(() => {
    return () => {
      pollers.current.forEach((h) => window.clearInterval(h));
      pollers.current.clear();
    };
  }, []);

  return { pending, accepted, rejected, addFiles, remove, refreshLists };
}
