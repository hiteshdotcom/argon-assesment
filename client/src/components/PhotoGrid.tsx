import type { ImageRow } from "../api";
import { Icon } from "./Icon";
import { REASON_CAPTIONS, primaryRejectionRule, failedCount } from "../lib/rules";

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
}

export function RejectedCell({ img, onDelete, onClick }: RejectedCellProps) {
  const reasonKey = primaryRejectionRule(img);
  const reason = reasonKey ? REASON_CAPTIONS[reasonKey] : "Did not pass review";
  const failed = failedCount(img);

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
        <span className="photo-reason-text" onClick={onClick}>
          {reason}
        </span>
        {failed > 1 && (
          <span className="photo-reason-sub">
            +{failed - 1} other issue{failed - 1 !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
