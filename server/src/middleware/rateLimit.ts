import rateLimit from "express-rate-limit";

// Conservative limit on the only mutating endpoint. Bypass with `X-Bypass: …`
// is intentionally NOT supported — gate at the proxy if you need internal tools.
export const uploadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many uploads, slow down." },
});
