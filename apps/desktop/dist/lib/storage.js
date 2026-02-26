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
        name: typeof data.name === "string" && data.name.trim()
            ? data.name.trim()
            : id,
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
        name: typeof data.name === "string" && data.name.trim()
            ? data.name.trim()
            : id,
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
            if (item.type === "image" && item.imageUrl && item.size === undefined) {
                const filename = item.imageUrl.split(/[\\/]/).pop();
                if (filename) {
                    const imgPath = path_1.default.join((0, paths_1.getImagesPath)(), filename);
                    if (fs_1.default.existsSync(imgPath)) {
                        try {
                            item.size = fs_1.default.statSync(imgPath).size;
                            modified = true;
                        }
                        catch (e) {
                            // Ignore errors if file can't be stat'd
                        }
                    }
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
function saveImage(imageData, filename) {
    try {
        ensureDataDirectories();
        const imagesPath = (0, paths_1.getImagesPath)();
        const filePath = path_1.default.join(imagesPath, filename);
        // imageData is base64 encoded
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs_1.default.writeFileSync(filePath, base64Data, "base64");
        const size = fs_1.default.statSync(filePath).size;
        // Return relative path so frontend can construct vaulty-image:// URLs correctly
        const relativePath = `images/${filename}`;
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
        const filePath = path_1.default.join(metadataPath, filename);
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs_1.default.writeFileSync(filePath, base64Data, "base64");
        const size = fs_1.default.statSync(filePath).size;
        const relativePath = `metadata/${filename}`;
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
        const filePath = path_1.default.join(audiosPath, filename);
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs_1.default.writeFileSync(filePath, base64Data, "base64");
        const size = fs_1.default.statSync(filePath).size;
        const relativePath = `audios/${filename}`;
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
        const filePath = path_1.default.join(audiosPath, filename);
        // Strip out standard data-URI prefixes mapping audio types (audio/mp3, audio/mpeg...)
        const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, "");
        fs_1.default.writeFileSync(filePath, base64Data, "base64");
        const size = fs_1.default.statSync(filePath).size;
        // Return relative path so frontend can construct vaulty-image:// URLs correctly
        const relativePath = `audios/${filename}`;
        return { success: true, path: relativePath, size };
    }
    catch (err) {
        console.error("Failed to save audio:", err);
        return { success: false, error: String(err) };
    }
}
// Trash functions
const TRASH_RETENTION_DAYS = 60;
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
    if (item.imageUrl) {
        const filename = item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
            if (item.type === "audio") {
                const srcPath = path_1.default.join((0, paths_1.getAudiosPath)(), filename);
                const destPath = path_1.default.join((0, paths_1.getTrashAudiosPath)(), filename);
                if (fs_1.default.existsSync(srcPath)) {
                    fs_1.default.renameSync(srcPath, destPath);
                }
            }
            else {
                const srcPath = path_1.default.join((0, paths_1.getImagesPath)(), filename);
                const destPath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
                if (fs_1.default.existsSync(srcPath)) {
                    fs_1.default.renameSync(srcPath, destPath);
                }
            }
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
    if (trashedItem.item.imageUrl) {
        const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
            if (trashedItem.item.type === "audio") {
                const srcPath = path_1.default.join((0, paths_1.getTrashAudiosPath)(), filename);
                const destPath = path_1.default.join((0, paths_1.getAudiosPath)(), filename);
                if (fs_1.default.existsSync(srcPath)) {
                    fs_1.default.renameSync(srcPath, destPath);
                }
            }
            else {
                const srcPath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
                const destPath = path_1.default.join((0, paths_1.getImagesPath)(), filename);
                if (fs_1.default.existsSync(srcPath)) {
                    fs_1.default.renameSync(srcPath, destPath);
                }
            }
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
    if (trashedItem.item.imageUrl) {
        const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
            if (trashedItem.item.type === "audio") {
                const filePath = path_1.default.join((0, paths_1.getTrashAudiosPath)(), filename);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
            else {
                const filePath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
        }
    }
    trash.splice(index, 1);
    saveTrash(trash);
}
function emptyTrash() {
    const trash = loadTrash();
    for (const trashedItem of trash) {
        if (trashedItem.item.imageUrl) {
            const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
            if (filename) {
                if (trashedItem.item.type === "audio") {
                    const filePath = path_1.default.join((0, paths_1.getTrashAudiosPath)(), filename);
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }
                else {
                    const filePath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }
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
            if (trashedItem.item.imageUrl) {
                const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
                if (filename) {
                    if (trashedItem.item.type === "audio") {
                        const filePath = path_1.default.join((0, paths_1.getTrashAudiosPath)(), filename);
                        if (fs_1.default.existsSync(filePath)) {
                            fs_1.default.unlinkSync(filePath);
                        }
                    }
                    else {
                        const filePath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
                        if (fs_1.default.existsSync(filePath)) {
                            fs_1.default.unlinkSync(filePath);
                        }
                    }
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
