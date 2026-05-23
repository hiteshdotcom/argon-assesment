export function EmptyAccepted() {
  return (
    <div className="empty-grid">
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        style={{ margin: "0 auto", display: "block" }}
      >
        <circle cx="48" cy="48" r="28" stroke="#180C44" strokeWidth="4" fill="#EBE9F3" />
        <path d="M68 68 L92 92" stroke="#E30047" strokeWidth="6" strokeLinecap="round" />
        <circle cx="48" cy="48" r="14" fill="#fff" />
        <path d="M42 46 q6 -6 12 0" stroke="#180C44" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="44" cy="50" r="1.5" fill="#180C44" />
        <circle cx="52" cy="50" r="1.5" fill="#180C44" />
      </svg>
      <h4>No photos yet</h4>
      <p>
        Drop a few shots into the panel on the left. We'll run the six-rule pipeline and
        surface anything that needs attention.
      </p>
    </div>
  );
}
