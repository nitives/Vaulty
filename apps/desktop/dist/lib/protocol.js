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
const ALLOWED_VAULT_PROTOCOL_FOLDERS = new Set([
    "images",
    "metadata",
    "audios",
]);
function resolveVaultProtocolPath(requestUrl) {
    let url;
    try {
        url = new URL(requestUrl);
    }
    catch {
        return null;
    }
    const hostPart = decodeURIComponent(url.hostname || "");
    const pathPart = decodeURIComponent(url.pathname).replace(/^\//, "");
    const rawRelativePath = hostPart ? `${hostPart}/${pathPart}` : pathPart;
    const cleaned = rawRelativePath.trim().replace(/\\/g, "/");
    if (!cleaned ||
        cleaned.startsWith("/") ||
        /^[a-zA-Z]:/.test(cleaned)) {
        return null;
    }
    const normalized = path_1.default.posix.normalize(cleaned);
    if (normalized === "." ||
        normalized.startsWith("../") ||
        normalized.includes("/../")) {
        return null;
    }
    const rootFolder = normalized.split("/")[0];
    if (!ALLOWED_VAULT_PROTOCOL_FOLDERS.has(rootFolder)) {
        return null;
    }
    const vaultRoot = path_1.default.resolve((0, paths_1.getVaultyDataPath)());
    const filePath = path_1.default.resolve(vaultRoot, normalized);
    if (filePath === vaultRoot || !filePath.startsWith(`${vaultRoot}${path_1.default.sep}`)) {
        return null;
    }
    return filePath;
}
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
    const mimeTypes = {
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
    electron_1.protocol.handle("vaulty-image", (request) => {
        const filePath = resolveVaultProtocolPath(request.url);
        if (!filePath) {
            return new Response("Not found", { status: 404 });
        }
        try {
            const stat = fs_1.default.statSync(filePath);
            if (!stat.isFile()) {
                return new Response("Not found", { status: 404 });
            }
            const fileSize = stat.size;
            const ext = path_1.default.extname(filePath).toLowerCase();
            const mimeType = mimeTypes[ext] || "application/octet-stream";
            // Check for Range header (needed for audio/video seeking)
            const rangeHeader = request.headers.get("Range");
            if (rangeHeader) {
                const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
                if (match) {
                    const start = parseInt(match[1], 10);
                    const requestedEnd = match[2] ? parseInt(match[2], 10) : fileSize - 1;
                    const end = Math.min(requestedEnd, fileSize - 1);
                    if (Number.isNaN(start) ||
                        Number.isNaN(end) ||
                        start >= fileSize ||
                        end < start) {
                        return new Response("Range not satisfiable", {
                            status: 416,
                            headers: {
                                "Content-Range": `bytes */${fileSize}`,
                            },
                        });
                    }
                    const chunkSize = end - start + 1;
                    const buffer = Buffer.alloc(chunkSize);
                    const fd = fs_1.default.openSync(filePath, "r");
                    fs_1.default.readSync(fd, buffer, 0, chunkSize, start);
                    fs_1.default.closeSync(fd);
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
            const data = fs_1.default.readFileSync(filePath);
            return new Response(data, {
                headers: {
                    "Content-Type": mimeType,
                    "Content-Length": String(fileSize),
                    "Accept-Ranges": "bytes",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }
        catch (err) {
            console.error("Failed to load file:", filePath, err);
            return new Response("Not found", { status: 404 });
        }
    });
}
