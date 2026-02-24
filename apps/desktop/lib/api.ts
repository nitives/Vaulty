import http from "http";
import path from "path";
import { app, BrowserWindow } from "electron";
import { loadItems, saveItems, StoredItem, saveImage } from "./storage";

export const LOCAL_API_PORT = app.isPackaged ? 41234 : 41235;

export function startLocalApi(
  getMainWindow: () => BrowserWindow | null,
): http.Server {
  const server = http.createServer((req, res) => {
    // Add CORS headers so extensions can talk to it
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/save") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);

          const type = data.type || "note";
          const content = data.content || "";
          const tags = data.tags || [];

          const newItem: StoredItem = {
            id: crypto.randomUUID(),
            type,
            content,
            tags,
            createdAt: new Date().toISOString(),
          };

          if (type === "image" && data.imageUrlToDownload) {
            try {
              const fetchOptions: RequestInit = {
                method: "GET",
              };
              if (content) {
                fetchOptions.headers = { Referer: content };
              }
              const imgRes = await fetch(data.imageUrlToDownload, fetchOptions);
              if (imgRes.ok) {
                const arrayBuffer = await imgRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Data = buffer.toString("base64");

                const urlObj = new URL(data.imageUrlToDownload);
                let ext = path.extname(urlObj.pathname);
                if (!ext) ext = ".png";

                const filename = `${newItem.id}${ext}`;
                const saveResult = saveImage(base64Data, filename);

                if (saveResult.success) {
                  newItem.imageUrl = saveResult.path;
                  newItem.size = saveResult.size;
                }
              }
            } catch (err) {
              console.error("Failed to download image from extension:", err);
            }
          }

          const items = loadItems();
          items.unshift(newItem);
          saveItems(items);

          // Tell the main window to reload or refresh items if it's open
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.reload(); // Simple refresh to pick up new items
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, item: newItem }));
        } catch (error) {
          console.error("Local API Error:", error);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(LOCAL_API_PORT, "127.0.0.1", () => {
    console.log(`Local API listening on http://127.0.0.1:${LOCAL_API_PORT}`);
  });

  return server;
}
