import type { ErrorRequestHandler } from "express";
import multer from "multer";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ error: err.code, message: err.message });
    return;
  }
  if (err && typeof err === "object" && "status" in err) {
    const e = err as { status: number; message: string };
    res.status(e.status).json({ error: "request_error", message: e.message });
    return;
  }
  console.error("[unhandled]", err);
  res.status(500).json({ error: "internal_error" });
};
