import { useRef, useState, type DragEvent } from "react";
import { Icon } from "./Icon";

interface Props {
  uploading: boolean;
  target: number;
  currentGood: number;
  onFiles: (files: FileList | File[]) => void;
}

export function UploadSidebar({ uploading, target, currentGood, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const remaining = Math.max(0, target - currentGood);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
  };

  return (
    <aside className="upload-sidebar">
      <div className="upload-icon-frame">
        <Icon name="image-up" size={22} stroke={1.7} />
      </div>
      <h1 className="upload-title">Upload photos</h1>
      <p className="upload-copy">
        Drop in <strong>at least {target} of your best shots</strong>. We run a
        six-rule quality check — clean light, sharp focus, one face, framed close — so
        the model has the best material to work with.
      </p>

      <div
        className={
          "dropzone" +
          (uploading ? " is-uploading" : "") +
          (dragging ? " is-dragging" : "")
        }
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className={"dropzone-cta" + (uploading ? " is-uploading" : "")}
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            if (!uploading) inputRef.current?.click();
          }}
        >
          {uploading ? (
            <>
              <span className="spinner-sm" />
              Uploading…
            </>
          ) : (
            <>
              <Icon name="upload" size={16} stroke={2.4} />
              Choose photos
            </>
          )}
        </button>
        <div className="dropzone-hint">…or drag &amp; drop here</div>
        <div className="dropzone-sub">PNG · JPG · HEIC&nbsp;&nbsp;up to 15 MB each</div>
      </div>

      <div className="reassure">
        <div className="reassure-row">
          <Icon name="shield-check" size={14} stroke={2} />
          <div>
            Photos never leave our servers — keys aren't exposed and links expire in 15 min.
          </div>
        </div>
        <div className="reassure-row">
          <Icon name="sparkles" size={14} stroke={2} />
          <div>
            {remaining > 0 ? (
              <>
                You need <strong>{remaining} more</strong> good photo
                {remaining !== 1 ? "s" : ""} to continue.
              </>
            ) : (
              <>
                <strong>Nice — you have enough.</strong> You can replace rejects, or continue.
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
