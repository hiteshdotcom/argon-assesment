import { useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "./components/Brand";
import { ProgressStrip } from "./components/ProgressStrip";
import { UploadSidebar } from "./components/UploadSidebar";
import { AcceptedTile, RejectedCell } from "./components/PhotoGrid";
import { ProcessingBanner } from "./components/ProcessingBanner";
import { Inspector } from "./components/Inspector";
import { Toast, type ToastTone } from "./components/Toast";
import { EmptyAccepted } from "./components/EmptyState";
import { Icon } from "./components/Icon";
import { useImageUpload, type PendingItem } from "./hooks/useImageUpload";
import { getConfig, type ImageRow, type ServerConfig } from "./api";

const TARGET = 10;
const MIN_TO_CONTINUE = 6;

/**
 * Synthesize an ImageRow for an in-flight upload that doesn't yet have a
 * server row. Lets the ProcessingBanner render immediately while we wait
 * for the first poll to return.
 */
function pendingToRow(p: PendingItem): ImageRow {
  if (p.row) return p.row;
  const now = new Date().toISOString();
  return {
    id: p.localId,
    originalName: p.file.name,
    mimeType: p.file.type || "image/jpeg",
    sizeBytes: p.file.size,
    width: null,
    height: null,
    status: p.status === "uploading" ? "PENDING" : "PROCESSING",
    rejectionReasons: null,
    perceptualHash: null,
    faceCount: null,
    blurScore: null,
    createdAt: now,
    updatedAt: now,
    previewUrl: p.previewUrl,
  };
}

interface ToastState {
  open: boolean;
  title: string;
  sub?: string;
  tone: ToastTone;
}

export function App() {
  const { pending, accepted, rejected, addFiles, remove } = useImageUpload();
  const [inspect, setInspect] = useState<ImageRow | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false, title: "", tone: "success" });
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  // Fetch runtime config once — drives the face-model-disabled notice and
  // makes per-rule "skipped" state visible in the Inspector.
  useEffect(() => {
    getConfig()
      .then(setServerConfig)
      .catch((err) => console.warn("config fetch failed", err));
  }, []);

  const faceModelLoaded = serverConfig?.faceModelLoaded ?? true;

  // Watch pending items reaching a terminal state to fire a toast once each.
  const announced = useRef(new Set<string>());
  useEffect(() => {
    for (const p of pending) {
      if (p.status !== "accepted" && p.status !== "rejected" && p.status !== "error") continue;
      if (announced.current.has(p.localId)) continue;
      announced.current.add(p.localId);

      if (p.status === "accepted") {
        setToast({
          open: true,
          title: "Photo accepted",
          sub: `${p.file.name} passed all six checks.`,
          tone: "success",
        });
      } else if (p.status === "rejected") {
        setToast({
          open: true,
          title: "Photo needs attention",
          sub: `${p.file.name} failed one of the six rules.`,
          tone: "warn",
        });
      } else {
        setToast({
          open: true,
          title: "Upload failed",
          sub: p.error ?? `${p.file.name} could not be uploaded.`,
          tone: "error",
        });
      }
    }
  }, [pending]);

  const inflight = useMemo(
    () => pending.find((p) => p.status === "uploading" || p.status === "processing"),
    [pending],
  );
  const processingImage: ImageRow | null = inflight ? pendingToRow(inflight) : null;
  const uploading = pending.some((p) => p.status === "uploading");

  const canContinue = accepted.length >= MIN_TO_CONTINUE;

  return (
    <div className="argon">
      <div className="app-top">
        <Brand />
        <ProgressStrip current={accepted.length} total={TARGET} />
        <button className="close" aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="app-body">
        <UploadSidebar
          uploading={uploading}
          target={MIN_TO_CONTINUE}
          currentGood={accepted.length}
          onFiles={addFiles}
          faceModelLoaded={faceModelLoaded}
        />

        <main className="app-main">
          {processingImage && <ProcessingBanner processingImage={processingImage} />}

          <section className="panel">
            <div className="panel-head">
              <div className="panel-head-l">
                <h2>Uploaded photos</h2>
                <p>These passed all six validation rules and are ready to use.</p>
              </div>
              <div className="panel-head-r">
                <span className={`count-pill ${canContinue ? "is-good" : ""}`}>
                  <span className="num">{accepted.length}</span>
                  <span>/&nbsp;{TARGET}</span>
                </span>
              </div>
            </div>
            <div className="panel-progress">
              <span style={{ width: `${Math.min(100, (accepted.length / TARGET) * 100)}%` }} />
            </div>

            {accepted.length === 0 && !processingImage ? (
              <EmptyAccepted />
            ) : (
              <div className="photo-grid">
                {accepted.map((img) => (
                  <AcceptedTile
                    key={img.id}
                    img={img}
                    onDelete={remove}
                    onClick={() => setInspect(img)}
                  />
                ))}
              </div>
            )}
          </section>

          {rejected.length > 0 && (
            <section className="panel muted-pink">
              <div className="panel-head">
                <div className="panel-head-l">
                  <h2>Some photos didn't meet the guidelines</h2>
                  <p>
                    You can keep going — replacing these is optional. Tap any caption for
                    details.
                  </p>
                </div>
                <div className="panel-head-r">
                  <span className="count-pill is-warn">
                    <span className="num">{rejected.length}</span>
                    <span>rejected</span>
                  </span>
                  <button
                    className={`collapse-btn ${collapsed ? "is-collapsed" : ""}`}
                    onClick={() => setCollapsed((c) => !c)}
                    aria-label={collapsed ? "Expand" : "Collapse"}
                  >
                    <Icon name="chevron-up" size={18} stroke={2.2} />
                  </button>
                </div>
              </div>
              {!collapsed && (
                <div className="photo-grid">
                  {rejected.map((img) => (
                    <RejectedCell
                      key={img.id}
                      img={img}
                      onDelete={remove}
                      onClick={() => setInspect(img)}
                      faceModelLoaded={faceModelLoaded}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="footer-actions">
            <button className="btn btn-ghost" type="button">
              <Icon name="arrow-left" size={16} />
              Back
            </button>
            <button
              type="button"
              className={`btn btn-filled ${canContinue ? "" : "btn-disabled"}`}
              disabled={!canContinue}
            >
              {canContinue
                ? "Continue to next step"
                : `Need ${MIN_TO_CONTINUE - accepted.length} more`}
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </main>
      </div>

      {toast.open && (
        <Toast
          title={toast.title}
          sub={toast.sub}
          tone={toast.tone}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        />
      )}

      {inspect && (
        <Inspector
          img={inspect}
          faceModelLoaded={faceModelLoaded}
          onClose={() => setInspect(null)}
        />
      )}
    </div>
  );
}
