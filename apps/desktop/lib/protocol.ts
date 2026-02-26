import fs from "fs";
import path from "path";
import { protocol } from "electron";
import { getVaultyDataPath } from "./paths";

// Register custom protocol scheme - must be called before app.ready
export function registerProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "vaulty-image",
      privileges: {
        secure: true,
        supportFetchAPI: true,
        stream: true,
      },
    },
  ]);
}

// Register protocol handler - must be called after app.ready
export function registerProtocolHandler(): void {
  const mimeTypes: Record<string, string> = {
    // Images
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    // Audio
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".wma": "audio/x-ms-wma",
    ".opus": "audio/opus",
    // Video
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
  };

  protocol.handle("vaulty-image", (request) => {
    // URL format: vaulty-image://images/filename.ext
    // Note: In URL parsing, "images" becomes the hostname
    const url = new URL(request.url);
    const hostPart = url.hostname || "";
    const pathPart = decodeURIComponent(url.pathname).replace(/^\//, "");
    const relativePath = hostPart ? `${hostPart}/${pathPart}` : pathPart;
    const filePath = path.join(getVaultyDataPath(), relativePath);

    try {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = mimeTypes[ext] || "application/octet-stream";

      // Check for Range header (needed for audio/video seeking)
      const rangeHeader = request.headers.get("Range");

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
          const chunkSize = end - start + 1;

          const buffer = Buffer.alloc(chunkSize);
          const fd = fs.openSync(filePath, "r");
          fs.readSync(fd, buffer, 0, chunkSize, start);
          fs.closeSync(fd);

          return new Response(buffer, {
            status: 206,
            headers: {
              "Content-Type": mimeType,
              "Content-Length": String(chunkSize),
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      }

      // Full file response
      const data = fs.readFileSync(filePath);
      return new Response(data, {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.error("Failed to load file:", filePath, err);
      return new Response("Not found", { status: 404 });
    }
  });
}
