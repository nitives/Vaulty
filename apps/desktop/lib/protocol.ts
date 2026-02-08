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
  protocol.handle("vaulty-image", (request) => {
    // URL format: vaulty-image://images/filename.png
    // Note: In URL parsing, "images" becomes the hostname
    const url = new URL(request.url);
    const hostPart = url.hostname || "";
    const pathPart = decodeURIComponent(url.pathname).replace(/^\//, "");
    const relativePath = hostPart ? `${hostPart}/${pathPart}` : pathPart;
    const filePath = path.join(getVaultyDataPath(), relativePath);

    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".bmp": "image/bmp",
      };
      const mimeType = mimeTypes[ext] || "application/octet-stream";

      return new Response(data, {
        headers: { "Content-Type": mimeType },
      });
    } catch (err) {
      console.error("Failed to load image:", filePath, err);
      return new Response("Not found", { status: 404 });
    }
  });
}
