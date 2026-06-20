"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDataDirectories = ensureDataDirectories;
exports.loadItems = loadItems;
exports.saveItems = saveItems;
exports.loadFolders = loadFolders;
exports.saveFolders = saveFolders;
exports.loadPages = loadPages;
exports.savePages = savePages;
exports.loadPulses = loadPulses;
exports.savePulses = savePulses;
exports.loadPulseItems = loadPulseItems;
exports.savePulseItems = savePulseItems;
exports.saveImage = saveImage;
exports.saveMetadataImage = saveMetadataImage;
exports.saveAudioImage = saveAudioImage;
exports.saveAudio = saveAudio;
exports.vaultFileExists = vaultFileExists;
exports.readVaultFile = readVaultFile;
exports.writeVaultFile = writeVaultFile;
exports.loadTrash = loadTrash;
exports.saveTrash = saveTrash;
exports.moveToTrash = moveToTrash;
exports.restoreFromTrash = restoreFromTrash;
exports.permanentlyDeleteFromTrash = permanentlyDeleteFromTrash;
exports.emptyTrash = emptyTrash;
exports.cleanupOldTrash = cleanupOldTrash;
exports.clearAllData = clearAllData;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("./paths");
function asIsoDate(value) {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return null;
    }
    return new Date(timestamp).toISOString();
}
function normalizeHeartbeat(value) {
    if (typeof value !== "string") {
        return "1h";
    }
    const heartbeat = value.trim().toLowerCase();
    if (!heartbeat) {
        return "1h";
    }
    // Supports 15m, 1h, 2d
    if (/^\d+\s*[mhd]$/.test(heartbeat)) {
        return heartbeat.replace(/\s+/g, "");
    }
    return "1h";
}
function normalizePulse(raw) {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const data = raw;
    const id = typeof data.id === "string" ? data.id.trim() : "";
    if (!id) {
        return null;
    }
    const nowIso = new Date().toISOString();
    return {
        id,
        name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : id,
        heartbeat: normalizeHeartbeat(data.heartbeat),
        lastChecked: asIsoDate(data.lastChecked),
        lastAnchorValue: typeof data.lastAnchorValue === "string" ? data.lastAnchorValue : null,
        enabled: typeof data.enabled === "boolean" ? data.enabled : true,
        addedAt: asIsoDate(data.addedAt) ?? nowIso,
        filePath: typeof data.filePath === "string" && data.filePath.trim()
            ? data.filePath
            : undefined,
    };
}
function normalizeFolder(raw) {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const data = raw;
    const id = typeof data.id === "string" ? data.id.trim() : "";
    if (!id) {
        return null;
    }
    const nowIso = new Date().toISOString();
    const normalizedCreatedAt = asIsoDate(data.createdAt) ?? nowIso;
    const parentFolderId = typeof data.parentFolderId === "string" && data.parentFolderId.trim()
        ? data.parentFolderId.trim()
        : null;
    return {
        id,
        name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : id,
        createdAt: normalizedCreatedAt,
        parentFolderId: parentFolderId === id ? null : parentFolderId,
    };
}
function normalizePulseItem(raw) {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const data = raw;
    const id = typeof data.id === "string" ? data.id.trim() : "";
    const pulseId = typeof data.pulseId === "string" ? data.pulseId.trim() : "";
    if (!id || !pulseId) {
        return null;
    }
    const expiresAt = asIsoDate(data.expiresAt) ?? undefined;
    return {
        id,
        pulseId,
        title: typeof data.title === "string" && data.title.trim()
            ? data.title
            : "Pulse Update",
        content: typeof data.content === "string" ? data.content : "",
        url: typeof data.url === "string" ? data.url : undefined,
        isSeen: Boolean(data.isSeen),
        createdAt: asIsoDate(data.createdAt) ?? new Date().toISOString(),
        expiresAt,
        anchorValue: typeof data.anchorValue === "string" ? data.anchorValue : undefined,
    };
}
function isExpiredPulseItem(item, nowMs) {
    if (!item.expiresAt) {
        return false;
    }
    return Date.parse(item.expiresAt) <= nowMs;
}
// Ensure data directories exist
function ensureDataDirectories() {
    const dataPath = (0, paths_1.getVaultyDataPath)();
    const imagesPath = (0, paths_1.getImagesPath)();
    const metadataPath = (0, paths_1.getMetadataPath)();
    const audiosPath = (0, paths_1.getAudiosPath)();
    const trashPath = (0, paths_1.getTrashPath)();
    const trashImagesPath = (0, paths_1.getTrashImagesPath)();
    const trashAudiosPath = (0, paths_1.getTrashAudiosPath)();
    if (!fs_1.default.existsSync(dataPath)) {
        fs_1.default.mkdirSync(dataPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(imagesPath)) {
        fs_1.default.mkdirSync(imagesPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(metadataPath)) {
        fs_1.default.mkdirSync(metadataPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(audiosPath)) {
        fs_1.default.mkdirSync(audiosPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(trashPath)) {
        fs_1.default.mkdirSync(trashPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(trashImagesPath)) {
        fs_1.default.mkdirSync(trashImagesPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(trashAudiosPath)) {
        fs_1.default.mkdirSync(trashAudiosPath, { recursive: true });
    }
    const pulsesConfigPath = (0, paths_1.getPulsesConfigPath)();
    const legacyPulsesConfigPath = (0, paths_1.getLegacyPulsesConfigPath)();
    // Move old userData/pulses config directory to the Vault data root.
    if (legacyPulsesConfigPath !== pulsesConfigPath &&
        fs_1.default.existsSync(legacyPulsesConfigPath) &&
        fs_1.default.statSync(legacyPulsesConfigPath).isDirectory()) {
        try {
            if (!fs_1.default.existsSync(pulsesConfigPath)) {
                fs_1.default.renameSync(legacyPulsesConfigPath, pulsesConfigPath);
            }
            else {
                fs_1.default.cpSync(legacyPulsesConfigPath, pulsesConfigPath, {
                    recursive: true,
                    force: false,
                });
                fs_1.default.rmSync(legacyPulsesConfigPath, { recursive: true, force: true });
            }
        }
        catch (err) {
            console.error("Failed to migrate legacy pulses folder:", err);
        }
    }
    if (!fs_1.default.existsSync(pulsesConfigPath)) {
        fs_1.default.mkdirSync(pulsesConfigPath, { recursive: true });
    }
}
function loadItems() {
    try {
        ensureDataDirectories();
        const filePath = (0, paths_1.getItemsFilePath)();
        if (!fs_1.default.existsSync(filePath)) {
            return [];
        }
        const data = fs_1.default.readFileSync(filePath, "utf-8");
        const items = JSON.parse(data);
        let modified = false;
        // Backfill size for images
        for (const item of items) {
            const imagePaths = item.type === "image" && item.imageUrls && item.imageUrls.length > 0
                ? item.imageUrls
                : item.type === "image" && item.imageUrl
                    ? [item.imageUrl]
                    : [];
            if (imagePaths.length > 0 && item.size === undefined) {
                let totalSize = 0;
                for (const imagePath of imagePaths) {
                    const filename = imagePath.split(/[\\/]/).pop();
                    if (filename) {
                        const imgPath = path_1.default.join((0, paths_1.getImagesPath)(), filename);
                        if (fs_1.default.existsSync(imgPath)) {
                            try {
                                totalSize += fs_1.default.statSync(imgPath).size;
                            }
                            catch (e) {
                                // Ignore errors if file can't be stat'd
                            }
                        }
                    }
                }
                if (totalSize > 0) {
                    item.size = totalSize;
                    modified = true;
                }
            }
        }
        if (modified) {
            saveItems(items);
        }
        return items;
    }
    catch (err) {
        console.error("Failed to load items:", err);
        return [];
    }
}
function saveItems(items) {
    try {
        ensureDataDirectories();
        fs_1.default.writeFileSync((0, paths_1.getItemsFilePath)(), JSON.stringify(items, null, 2));
    }
    catch (err) {
        console.error("Failed to save items:", err);
    }
}
function loadFolders() {
    try {
        ensureDataDirectories();
        const filePath = (0, paths_1.getFoldersFilePath)();
        if (!fs_1.default.existsSync(filePath)) {
            return [];
        }
        const data = fs_1.default.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            return [];
        }
        let modified = false;
        const normalized = [];
        for (const rawFolder of parsed) {
            const folder = normalizeFolder(rawFolder);
            if (!folder) {
                modified = true;
                continue;
            }
            normalized.push(folder);
            if (JSON.stringify(rawFolder) !== JSON.stringify(folder)) {
                modified = true;
            }
        }
        const folderById = new Map(normalized.map((folder) => [folder.id, folder]));
        for (const folder of normalized) {
            if (!folder.parentFolderId) {
                continue;
            }
            if (!folderById.has(folder.parentFolderId)) {
                folder.parentFolderId = null;
                modified = true;
                continue;
            }
            // Break ancestry cycles (A -> B -> A).
            const seen = new Set([folder.id]);
            let currentParentId = folder.parentFolderId;
            while (currentParentId) {
                if (seen.has(currentParentId)) {
                    folder.parentFolderId = null;
                    modified = true;
                    break;
                }
                seen.add(currentParentId);
                const parent = folderById.get(currentParentId);
                currentParentId = parent?.parentFolderId ?? null;
            }
        }
        if (modified) {
            saveFolders(normalized);
        }
        return normalized;
    }
    catch (err) {
        console.error("Failed to load folders:", err);
        return [];
    }
}
function saveFolders(folders) {
    try {
        ensureDataDirectories();
        fs_1.default.writeFileSync((0, paths_1.getFoldersFilePath)(), JSON.stringify(folders, null, 2));
    }
    catch (err) {
        console.error("Failed to save folders:", err);
    }
}
function loadPages() {
    try {
        ensureDataDirectories();
        const filePath = (0, paths_1.getPagesFilePath)();
        if (!fs_1.default.existsSync(filePath)) {
            return [];
        }
        const data = fs_1.default.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    }
    catch (err) {
        console.error("Failed to load pages:", err);
        return [];
    }
}
function savePages(pages) {
    try {
        ensureDataDirectories();
        fs_1.default.writeFileSync((0, paths_1.getPagesFilePath)(), JSON.stringify(pages, null, 2));
    }
    catch (err) {
        console.error("Failed to save pages:", err);
    }
}
function loadPulses() {
    try {
        ensureDataDirectories();
        const filePath = (0, paths_1.getPulsesFilePath)();
        if (!fs_1.default.existsSync(filePath)) {
            return [];
        }
        const data = fs_1.default.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            return [];
        }
        let modified = false;
        const normalized = [];
        for (const rawPulse of parsed) {
            const pulse = normalizePulse(rawPulse);
            if (!pulse) {
                modified = true;
                continue;
            }
            normalized.push(pulse);
            if (JSON.stringify(rawPulse) !== JSON.stringify(pulse)) {
                modified = true;
            }
        }
        if (modified) {
            savePulses(normalized);
        }
        return normalized;
    }
    catch (err) {
        console.error("Failed to load pulses:", err);
        return [];
    }
}
function savePulses(pulses) {
    try {
        ensureDataDirectories();
        fs_1.default.writeFileSync((0, paths_1.getPulsesFilePath)(), JSON.stringify(pulses, null, 2));
    }
    catch (err) {
        console.error("Failed to save pulses:", err);
    }
}
function loadPulseItems() {
    try {
        ensureDataDirectories();
        const filePath = (0, paths_1.getPulseItemsFilePath)();
        if (!fs_1.default.existsSync(filePath)) {
            return [];
        }
        const data = fs_1.default.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            return [];
        }
        let modified = false;
        const nowMs = Date.now();
        const normalized = [];
        for (const rawItem of parsed) {
            const item = normalizePulseItem(rawItem);
            if (!item) {
                modified = true;
                continue;
            }
            if (isExpiredPulseItem(item, nowMs)) {
                modified = true;
                continue;
            }
            normalized.push(item);
            if (JSON.stringify(rawItem) !== JSON.stringify(item)) {
                modified = true;
            }
        }
        if (modified) {
            savePulseItems(normalized);
        }
        return normalized;
    }
    catch (err) {
        console.error("Failed to load pulse items:", err);
        return [];
    }
}
function savePulseItems(items) {
    try {
        ensureDataDirectories();
        fs_1.default.writeFileSync((0, paths_1.getPulseItemsFilePath)(), JSON.stringify(items, null, 2));
    }
    catch (err) {
        console.error("Failed to save pulse items:", err);
    }
}
function getSafeMediaFileTarget(baseDirectory, filename) {
    if (typeof filename !== "string")
        return null;
    const safeFilename = filename.trim();
    if (!safeFilename ||
        safeFilename === "." ||
        safeFilename === ".." ||
        safeFilename.includes("\0") ||
        safeFilename.includes("/") ||
        safeFilename.includes("\\") ||
        /^[a-zA-Z]:/.test(safeFilename) ||
        path_1.default.isAbsolute(safeFilename)) {
        return null;
    }
    const basePath = path_1.default.resolve(baseDirectory);
    const filePath = path_1.default.resolve(basePath, safeFilename);
    if (filePath === basePath || !filePath.startsWith(`${basePath}${path_1.default.sep}`)) {
        return null;
    }
    return { filename: safeFilename, filePath };
}
function saveImage(imageData, filename) {
    try {
        ensureDataDirectories();
        const imagesPath = (0, paths_1.getImagesPath)();
        const target = getSafeMediaFileTarget(imagesPath, filename);
        if (!target) {
            return { success: false, error: "Invalid image filename." };
        }
        // imageData is base64 encoded
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs_1.default.writeFileSync(target.filePath, base64Data, "base64");
        const size = fs_1.default.statSync(target.filePath).size;
        // Return relative path so frontend can construct vaulty-image:// URLs correctly
        const relativePath = `images/${target.filename}`;
        return { success: true, path: relativePath, size };
    }
    catch (err) {
        console.error("Failed to save image:", err);
        return { success: false, error: String(err) };
    }
}
function saveMetadataImage(imageData, filename) {
    try {
        ensureDataDirectories();
        const metadataPath = (0, paths_1.getMetadataPath)();
        const target = getSafeMediaFileTarget(metadataPath, filename);
        if (!target) {
            return { success: false, error: "Invalid metadata image filename." };
        }
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs_1.default.writeFileSync(target.filePath, base64Data, "base64");
        const size = fs_1.default.statSync(target.filePath).size;
        const relativePath = `metadata/${target.filename}`;
        return { success: true, path: relativePath, size };
    }
    catch (err) {
        console.error("Failed to save metadata image:", err);
        return { success: false, error: String(err) };
    }
}
function saveAudioImage(imageData, filename) {
    try {
        ensureDataDirectories();
        const audiosPath = (0, paths_1.getAudiosPath)();
        const target = getSafeMediaFileTarget(audiosPath, filename);
        if (!target) {
            return { success: false, error: "Invalid audio image filename." };
        }
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs_1.default.writeFileSync(target.filePath, base64Data, "base64");
        const size = fs_1.default.statSync(target.filePath).size;
        const relativePath = `audios/${target.filename}`;
        return { success: true, path: relativePath, size };
    }
    catch (err) {
        console.error("Failed to save audio image:", err);
        return { success: false, error: String(err) };
    }
}
function saveAudio(audioData, filename) {
    try {
        ensureDataDirectories();
        const audiosPath = (0, paths_1.getAudiosPath)();
        const target = getSafeMediaFileTarget(audiosPath, filename);
        if (!target) {
            return { success: false, error: "Invalid audio filename." };
        }
        // Strip out standard data-URI prefixes mapping audio types (audio/mp3, audio/mpeg...)
        const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, "");
        fs_1.default.writeFileSync(target.filePath, base64Data, "base64");
        const size = fs_1.default.statSync(target.filePath).size;
        // Return relative path so frontend can construct vaulty-image:// URLs correctly
        const relativePath = `audios/${target.filename}`;
        return { success: true, path: relativePath, size };
    }
    catch (err) {
        console.error("Failed to save audio:", err);
        return { success: false, error: String(err) };
    }
}
const SYNCABLE_VAULT_FOLDERS = new Set(["images", "metadata", "audios"]);
function mimeTypeForPath(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const mimeByExt = {
        ".aac": "audio/aac",
        ".aiff": "audio/aiff",
        ".avif": "image/avif",
        ".flac": "audio/flac",
        ".gif": "image/gif",
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".m4a": "audio/mp4",
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".ogg": "audio/ogg",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".wav": "audio/wav",
        ".webm": "video/webm",
        ".webp": "image/webp",
    };
    return mimeByExt[ext] ?? "application/octet-stream";
}
function normalizeVaultRelativePath(relativePath) {
    if (typeof relativePath !== "string")
        return null;
    const cleaned = relativePath.trim().replace(/\\/g, "/");
    if (!cleaned || cleaned.startsWith("/") || /^[a-zA-Z]:/.test(cleaned)) {
        return null;
    }
    const normalized = path_1.default.posix.normalize(cleaned);
    if (normalized === "." ||
        normalized.startsWith("../") ||
        normalized.includes("/../")) {
        return null;
    }
    const rootFolder = normalized.split("/")[0];
    if (!SYNCABLE_VAULT_FOLDERS.has(rootFolder)) {
        return null;
    }
    return normalized;
}
function getVaultFileAbsolutePath(relativePath) {
    const normalized = normalizeVaultRelativePath(relativePath);
    if (!normalized)
        return null;
    const vaultRoot = path_1.default.resolve((0, paths_1.getVaultyDataPath)());
    const filePath = path_1.default.resolve(vaultRoot, normalized);
    if (filePath !== vaultRoot && filePath.startsWith(`${vaultRoot}${path_1.default.sep}`)) {
        return { normalized, filePath };
    }
    return null;
}
function vaultFileExists(relativePath) {
    try {
        ensureDataDirectories();
        const resolved = getVaultFileAbsolutePath(relativePath);
        if (!resolved) {
            return { success: false, exists: false, error: "Invalid vault file path." };
        }
        if (!fs_1.default.existsSync(resolved.filePath)) {
            return { success: true, exists: false, path: resolved.normalized };
        }
        const stat = fs_1.default.statSync(resolved.filePath);
        return {
            success: true,
            exists: stat.isFile(),
            path: resolved.normalized,
            updatedAt: stat.mtime.toISOString(),
            size: stat.size,
        };
    }
    catch (err) {
        return { success: false, exists: false, error: String(err) };
    }
}
function readVaultFile(relativePath) {
    try {
        ensureDataDirectories();
        const resolved = getVaultFileAbsolutePath(relativePath);
        if (!resolved) {
            return { success: false, error: "Invalid vault file path." };
        }
        if (!fs_1.default.existsSync(resolved.filePath)) {
            return { success: false, error: "Vault file does not exist." };
        }
        const stat = fs_1.default.statSync(resolved.filePath);
        if (!stat.isFile()) {
            return { success: false, error: "Vault path is not a file." };
        }
        const mimeType = mimeTypeForPath(resolved.filePath);
        const buffer = fs_1.default.readFileSync(resolved.filePath);
        return {
            success: true,
            path: resolved.normalized,
            data: `data:${mimeType};base64,${buffer.toString("base64")}`,
            mimeType,
            size: stat.size,
            updatedAt: stat.mtime.toISOString(),
        };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
function writeVaultFile(relativePath, data) {
    try {
        ensureDataDirectories();
        const resolved = getVaultFileAbsolutePath(relativePath);
        if (!resolved) {
            return { success: false, error: "Invalid vault file path." };
        }
        const match = /^data:[^;]+;base64,(.*)$/s.exec(data);
        if (!match) {
            return { success: false, error: "Vault file data must be a base64 data URL." };
        }
        fs_1.default.mkdirSync(path_1.default.dirname(resolved.filePath), { recursive: true });
        fs_1.default.writeFileSync(resolved.filePath, match[1], "base64");
        const size = fs_1.default.statSync(resolved.filePath).size;
        return { success: true, path: resolved.normalized, size };
    }
    catch (err) {
        return { success: false, error: String(err) };
    }
}
// Trash functions
const TRASH_RETENTION_DAYS = 60;
function itemMediaPaths(item) {
    if (item.type === "image" && item.imageUrls && item.imageUrls.length > 0) {
        return item.imageUrls;
    }
    return item.imageUrl ? [item.imageUrl] : [];
}
function moveMediaPath(relativePath, fromDirectory, toDirectory) {
    const filename = relativePath.split(/[\\/]/).pop();
    if (!filename)
        return;
    const srcPath = path_1.default.join(fromDirectory, filename);
    const destPath = path_1.default.join(toDirectory, filename);
    if (fs_1.default.existsSync(srcPath)) {
        fs_1.default.renameSync(srcPath, destPath);
    }
}
function deleteMediaPath(relativePath, directory) {
    const filename = relativePath.split(/[\\/]/).pop();
    if (!filename)
        return;
    const filePath = path_1.default.join(directory, filename);
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
}
function loadTrash() {
    try {
        ensureDataDirectories();
        const filePath = (0, paths_1.getTrashFilePath)();
        if (!fs_1.default.existsSync(filePath)) {
            return [];
        }
        const data = fs_1.default.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    }
    catch (err) {
        console.error("Failed to load trash:", err);
        return [];
    }
}
function saveTrash(items) {
    try {
        ensureDataDirectories();
        fs_1.default.writeFileSync((0, paths_1.getTrashFilePath)(), JSON.stringify(items, null, 2));
    }
    catch (err) {
        console.error("Failed to save trash:", err);
    }
}
function moveToTrash(item) {
    const trash = loadTrash();
    const trashedItem = {
        item,
        deletedAt: new Date().toISOString(),
    };
    for (const mediaPath of itemMediaPaths(item)) {
        if (item.type === "audio") {
            moveMediaPath(mediaPath, (0, paths_1.getAudiosPath)(), (0, paths_1.getTrashAudiosPath)());
        }
        else {
            moveMediaPath(mediaPath, (0, paths_1.getImagesPath)(), (0, paths_1.getTrashImagesPath)());
        }
    }
    trash.unshift(trashedItem);
    saveTrash(trash);
}
function restoreFromTrash(id) {
    const trash = loadTrash();
    const index = trash.findIndex((t) => t.item.id === id);
    if (index === -1)
        return null;
    const trashedItem = trash[index];
    trash.splice(index, 1);
    saveTrash(trash);
    for (const mediaPath of itemMediaPaths(trashedItem.item)) {
        if (trashedItem.item.type === "audio") {
            moveMediaPath(mediaPath, (0, paths_1.getTrashAudiosPath)(), (0, paths_1.getAudiosPath)());
        }
        else {
            moveMediaPath(mediaPath, (0, paths_1.getTrashImagesPath)(), (0, paths_1.getImagesPath)());
        }
    }
    // Add back to items
    const items = loadItems();
    items.unshift(trashedItem.item);
    saveItems(items);
    return trashedItem.item;
}
function permanentlyDeleteFromTrash(id) {
    const trash = loadTrash();
    const index = trash.findIndex((t) => t.item.id === id);
    if (index === -1)
        return;
    const trashedItem = trash[index];
    for (const mediaPath of itemMediaPaths(trashedItem.item)) {
        if (trashedItem.item.type === "audio") {
            deleteMediaPath(mediaPath, (0, paths_1.getTrashAudiosPath)());
        }
        else {
            deleteMediaPath(mediaPath, (0, paths_1.getTrashImagesPath)());
        }
    }
    trash.splice(index, 1);
    saveTrash(trash);
}
function emptyTrash() {
    const trash = loadTrash();
    for (const trashedItem of trash) {
        for (const mediaPath of itemMediaPaths(trashedItem.item)) {
            if (trashedItem.item.type === "audio") {
                deleteMediaPath(mediaPath, (0, paths_1.getTrashAudiosPath)());
            }
            else {
                deleteMediaPath(mediaPath, (0, paths_1.getTrashImagesPath)());
            }
        }
    }
    saveTrash([]);
}
function cleanupOldTrash() {
    const trash = loadTrash();
    const now = Date.now();
    const retentionMs = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    const remaining = trash.filter((trashedItem) => {
        const deletedAt = new Date(trashedItem.deletedAt).getTime();
        const age = now - deletedAt;
        if (age > retentionMs) {
            for (const mediaPath of itemMediaPaths(trashedItem.item)) {
                if (trashedItem.item.type === "audio") {
                    deleteMediaPath(mediaPath, (0, paths_1.getTrashAudiosPath)());
                }
                else {
                    deleteMediaPath(mediaPath, (0, paths_1.getTrashImagesPath)());
                }
            }
            deletedCount++;
            return false;
        }
        return true;
    });
    if (deletedCount > 0) {
        saveTrash(remaining);
        console.log(`Cleaned up ${deletedCount} items from trash (older than ${TRASH_RETENTION_DAYS} days)`);
    }
    return deletedCount;
}
function clearAllData() {
    try {
        ensureDataDirectories();
        // Clear items.json
        saveItems([]);
        // Clear folders.json and pages.json
        saveFolders([]);
        savePages([]);
        // Clear pulses
        savePulses([]);
        savePulseItems([]);
        // Clear trash.json
        saveTrash([]);
        // Delete all images
        const imagesPath = (0, paths_1.getImagesPath)();
        if (fs_1.default.existsSync(imagesPath)) {
            const files = fs_1.default.readdirSync(imagesPath);
            for (const file of files) {
                fs_1.default.unlinkSync(path_1.default.join(imagesPath, file));
            }
        }
        // Delete all metadata images
        const metadataPath = (0, paths_1.getMetadataPath)();
        if (fs_1.default.existsSync(metadataPath)) {
            const files = fs_1.default.readdirSync(metadataPath);
            for (const file of files) {
                fs_1.default.unlinkSync(path_1.default.join(metadataPath, file));
            }
        }
        // Delete all audios
        const audiosPath = (0, paths_1.getAudiosPath)();
        if (fs_1.default.existsSync(audiosPath)) {
            const files = fs_1.default.readdirSync(audiosPath);
            for (const file of files) {
                fs_1.default.unlinkSync(path_1.default.join(audiosPath, file));
            }
        }
        // Delete all trash images
        const trashImagesPath = (0, paths_1.getTrashImagesPath)();
        if (fs_1.default.existsSync(trashImagesPath)) {
            const files = fs_1.default.readdirSync(trashImagesPath);
            for (const file of files) {
                fs_1.default.unlinkSync(path_1.default.join(trashImagesPath, file));
            }
        }
        // Delete all trash audios
        const trashAudiosPath = (0, paths_1.getTrashAudiosPath)();
        if (fs_1.default.existsSync(trashAudiosPath)) {
            const files = fs_1.default.readdirSync(trashAudiosPath);
            for (const file of files) {
                fs_1.default.unlinkSync(path_1.default.join(trashAudiosPath, file));
            }
        }
    }
    catch (err) {
        console.error("Failed to clear all data:", err);
    }
}
