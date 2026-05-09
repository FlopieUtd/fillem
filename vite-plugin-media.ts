import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const SUPPORTED = /\.(mp4|mkv|webm|mov|avi|m4v)$/i;

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".m4v": "video/x-m4v",
};

interface VideoEntry {
  name: string;
  relativePath: string;
  size: number;
}

const scanDir = (dir: string, base: string): VideoEntry[] => {
  const results: VideoEntry[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...scanDir(fullPath, base ? `${base}/${entry}` : entry));
    } else if (SUPPORTED.test(entry)) {
      results.push({ name: entry, relativePath: base ? `${base}/${entry}` : entry, size: stat.size });
    }
  }
  return results;
};

export function mediaPlugin(mediaDir: string): Plugin {
  return {
    name: "vite-plugin-media",
    configureServer(server) {
      if (!mediaDir) return;

      server.middlewares.use("/api/videos", (_req: IncomingMessage, res: ServerResponse) => {
        try {
          const videos = scanDir(mediaDir, "").sort((a, b) =>
            a.relativePath.localeCompare(b.relativePath)
          );
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(videos));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Failed to read media directory" }));
        }
      });

      server.middlewares.use("/videos", (req: IncomingMessage, res: ServerResponse) => {
        const raw = req.url ?? "";
        const relativePath = decodeURIComponent(raw.startsWith("/") ? raw.slice(1) : raw);

        if (!relativePath || !SUPPORTED.test(relativePath) || relativePath.includes("..")) {
          res.statusCode = 400;
          res.end();
          return;
        }

        const filePath = path.join(mediaDir, relativePath);
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end();
          return;
        }

        const fileSize = fs.statSync(filePath).size;
        const ext = path.extname(relativePath).toLowerCase();
        const contentType = MIME[ext] ?? "video/mp4";
        const rangeHeader = req.headers["range"];

        if (rangeHeader) {
          const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-");
          const start = parseInt(startStr, 10);
          const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
            "Content-Type": contentType,
          });
          fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
          res.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
          });
          fs.createReadStream(filePath).pipe(res);
        }
      });
    },
  };
}
