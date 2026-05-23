import type { ImageRow } from "../api";
import { Icon } from "./Icon";
import { RULE_DEFS, deriveRuleStatuses } from "../lib/rules";

interface Props {
  img: ImageRow;
  faceModelLoaded: boolean;
  onClose: () => void;
}

export function Inspector({ img, faceModelLoaded, onClose }: Props) {
  const rules = deriveRuleStatuses(img, { faceModelLoaded });
  const byId = new Map(rules.map((r) => [r.id, r] as const));
  const sizeKB = Math.round(img.sizeBytes / 1024);

  return (
    <div className="inspector-backdrop" onClick={onClose}>
      <div className="inspector" onClick={(e) => e.stopPropagation()}>
        <div className="inspector-head">
          <h3>{img.originalName}</h3>
          <button className="toast-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="inspector-body">
          <div className="inspector-thumb">
            <img src={img.previewUrl} alt={img.originalName} />
          </div>
          <div className="inspector-meta">
            <span>
              <strong>
                {img.width ?? "?"}×{img.height ?? "?"}
              </strong>{" "}
              px
            </span>
            <span className="sep">·</span>
            <span>
              <strong>{sizeKB} KB</strong>
            </span>
            {img.blurScore != null && (
              <>
                <span className="sep">·</span>
                <span>
                  blur <strong>{img.blurScore.toFixed(1)}</strong>
                </span>
              </>
            )}
            {img.faceCount != null && (
              <>
                <span className="sep">·</span>
                <span>
                  faces <strong>{img.faceCount}</strong>
                </span>
              </>
            )}
          </div>
          {RULE_DEFS.map((rd) => {
            const r =
              byId.get(rd.id) ?? ({ id: rd.id, status: "pending" as const, message: undefined });
            return (
              <div key={rd.id} className={`rule-row is-${r.status}`}>
                <div className="rr-icon">
                  <Icon name={rd.icon} size={16} />
                </div>
                <div className="rr-body">
                  <div className="rr-name">{rd.name}</div>
                  <div className="rr-desc">
                    {r.message ??
                      (r.status === "pass"
                        ? `Passed · ${rd.desc}`
                        : r.status === "fail"
                          ? `Failed · ${rd.desc}`
                          : r.status === "skipped"
                            ? "Skipped — depends on an earlier step."
                            : r.status === "checking"
                              ? "Running…"
                              : `Pending · ${rd.desc}`)}
                  </div>
                </div>
                <div className="rr-mark">
                  {r.status === "pass" && <Icon name="check" size={12} stroke={4} />}
                  {r.status === "fail" && <Icon name="x" size={12} stroke={4} />}
                  {r.status === "checking" && <span className="spinner spin" />}
                  {r.status === "skipped" && <Icon name="minus" size={12} stroke={4} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
