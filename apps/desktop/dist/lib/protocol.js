"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProtocolScheme = registerProtocolScheme;
exports.registerProtocolHandler = registerProtocolHandler;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const paths_1 = require("./paths");
// Register custom protocol scheme - must be called before app.ready
function registerProtocolScheme() {
    electron_1.protocol.registerSchemesAsPrivileged([
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
function registerProtocolHandler() {
    electron_1.protocol.handle("vaulty-image", (request) => {
        // URL format: vaulty-image://images/filename.png
        // Note: In URL parsing, "images" becomes the hostname
        const url = new URL(request.url);
        const hostPart = url.hostname || "";
        const pathPart = decodeURIComponent(url.pathname).replace(/^\//, "");
        const relativePath = hostPart ? `${hostPart}/${pathPart}` : pathPart;
        const filePath = path_1.default.join((0, paths_1.getVaultyDataPath)(), relativePath);
        try {
            const data = fs_1.default.readFileSync(filePath);
            const ext = path_1.default.extname(filePath).toLowerCase();
            const mimeTypes = {
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
        }
        catch (err) {
            console.error("Failed to load image:", filePath, err);
            return new Response("Not found", { status: 404 });
        }
    });
}
