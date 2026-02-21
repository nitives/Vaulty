"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_API_PORT = void 0;
exports.startLocalApi = startLocalApi;
const http_1 = __importDefault(require("http"));
const storage_1 = require("./storage");
exports.LOCAL_API_PORT = 41234;
function startLocalApi(getMainWindow) {
    const server = http_1.default.createServer((req, res) => {
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
                    const newItem = {
                        id: crypto.randomUUID(),
                        type,
                        content,
                        tags,
                        createdAt: new Date().toISOString(),
                    };
                    const items = (0, storage_1.loadItems)();
                    items.unshift(newItem);
                    (0, storage_1.saveItems)(items);
                    // Tell the main window to reload or refresh items if it's open
                    const win = getMainWindow();
                    if (win && !win.isDestroyed()) {
                        win.webContents.reload(); // Simple refresh to pick up new items
                    }
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, item: newItem }));
                }
                catch (error) {
                    console.error("Local API Error:", error);
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
                }
            });
        }
        else {
            res.writeHead(404);
            res.end();
        }
    });
    server.listen(exports.LOCAL_API_PORT, "127.0.0.1", () => {
        console.log(`Local API listening on http://127.0.0.1:${exports.LOCAL_API_PORT}`);
    });
    return server;
}
