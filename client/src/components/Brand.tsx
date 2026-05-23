export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3 C 14 7, 18 9, 17 14 C 16.4 17.5, 14 19, 12 19 C 10 19, 7.6 17.5, 7 14 C 6 9, 10 7, 12 3 Z"
            fill="#fff"
          />
          <circle cx="12" cy="15" r="2.4" fill="var(--dd-red)" />
        </svg>
      </div>
      <div>
        <div className="brand-name">
          Argon<span className="dot">.</span>ai
        </div>
      </div>
    </div>
  );
}
