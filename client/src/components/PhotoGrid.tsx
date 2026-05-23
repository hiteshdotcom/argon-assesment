import type { ImageRow } from "../api";
import { Icon } from "./Icon";
import { RULE_DEFS, failedRules, friendlyCaption, primaryRejectionRule } from "../lib/rules";

interface AcceptedTileProps {
  img: ImageRow;
  onDelete: (id: string) => void;
  onClick: () => void;
  processing?: boolean;
}

export function AcceptedTile({ img, onDelete, onClick, processing }: AcceptedTileProps) {
  return (
    <div
      className={"photo-tile" + (processing ? " is-processing" : "")}
      onClick={onClick}
    >
      <img src={img.previewUrl} alt={img.originalName} loading="lazy" />
      {!processing && (
        <button
          className="tile-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(img.id);
          }}
          aria-label="Remove"
        >
          <Icon name="trash-2" size={14} stroke={2} />
        </button>
      )}
    </div>
  );
}

interface RejectedCellProps {
  img: ImageRow;
  onDelete: (id: string) => void;
  onClick: () => void;
  faceModelLoaded: boolean;
}

export function RejectedCell({ img, onDelete, onClick, faceModelLoaded }: RejectedCellProps) {
  const primary = primaryRejectionRule(img, { faceModelLoaded });
  const allFailed = failedRules(img, { faceModelLoaded });

  const { headline, detail } = primary
    ? friendlyCaption(primary)
    : { headline: "Did not pass review", detail: undefined };

  // List the names of the OTHER failing rules so a glance shows the full picture.
  const otherNames = allFailed
    .filter((r) => r.id !== primary?.id)
    .map((r) => RULE_DEFS.find((d) => d.id === r.id)?.name ?? r.id);

  return (
    <div className="photo-cell fade-in">
      <div className="photo-tile is-rejected" onClick={onClick}>
        <img src={img.previewUrl} alt={img.originalName} loading="lazy" />
        <button
          className="tile-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(img.id);
          }}
          aria-label="Remove"
        >
          <Icon name="trash-2" size={14} stroke={2} />
        </button>
      </div>
      <div className="photo-reason">
        <span className="photo-reason-text" onClick={onClick} title={detail}>
          {headline}
        </span>
        {detail && <span className="photo-reason-sub">{detail}</span>}
        {otherNames.length > 0 && (
          <span className="photo-reason-sub">
            Also failed: {otherNames.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
