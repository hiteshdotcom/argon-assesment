import { Icon } from "./Icon";

export type ToastTone = "success" | "warn" | "error";

interface Props {
  title: string;
  sub?: string;
  tone?: ToastTone;
  onClose: () => void;
}

export function Toast({ title, sub, tone = "success", onClose }: Props) {
  const iconCls =
    tone === "success" ? "toast-icon" : tone === "warn" ? "toast-icon is-warn" : "toast-icon is-err";
  const iconName = tone === "success" ? "check" : tone === "warn" ? "sparkles" : "x";

  return (
    <div className="toast">
      <div className={iconCls}>
        <Icon name={iconName} size={18} stroke={3} />
      </div>
      <div className="toast-body">
        <div className="toast-title">{title}</div>
        {sub && <div className="toast-sub">{sub}</div>}
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
