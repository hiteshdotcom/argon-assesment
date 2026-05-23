interface Props {
  current: number;
  total: number;
}

export function ProgressStrip({ current, total }: Props) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;
  return (
    <div className="progress-strip">
      <div className="progress-strip-track">
        <div className="progress-strip-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-strip-label">
        <span className="num">{current}</span>
        <span className="muted"> of {total} photos</span>
      </div>
    </div>
  );
}
