import express from "express";
import cors from "cors";
import helmet from "helmet";

import { config } from "./config";
import { imagesRouter } from "./routes/images";
import { errorHandler } from "./middleware/errorHandler";
import { ensureBucket } from "./s3";

// Side-effect import: registers the processImage handler with the queue.
import "./services/imageProcessor";

async function main() {
  await ensureBucket();

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.CLIENT_ORIGIN,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/images", imagesRouter);

  app.use(errorHandler);

  app.listen(config.PORT, () => {
    console.log(`[server] listening on http://localhost:${config.PORT}`);
    console.log(`[server] CORS origin: ${config.CLIENT_ORIGIN}`);
  });
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
