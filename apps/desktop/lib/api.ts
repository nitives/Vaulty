import http from "http";
import { app, BrowserWindow } from "electron";
import { loadItems, saveItems, StoredItem } from "./storage";

export const LOCAL_API_PORT = 41234;

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

      req.on("end", () => {
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
