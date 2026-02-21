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
exports.saveImage = saveImage;
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
// Ensure data directories exist
function ensureDataDirectories() {
    const dataPath = (0, paths_1.getVaultyDataPath)();
    const imagesPath = (0, paths_1.getImagesPath)();
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
        return JSON.parse(data);
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
function saveImage(imageData, filename) {
    try {
        ensureDataDirectories();
        const imagesPath = (0, paths_1.getImagesPath)();
        const filePath = path_1.default.join(imagesPath, filename);
        // imageData is base64 encoded
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs_1.default.writeFileSync(filePath, base64Data, "base64");
        const size = fs_1.default.statSync(filePath).size;
        return { success: true, path: filePath, size };
    }
    catch (err) {
        console.error("Failed to save image:", err);
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
        return { success: true, path: filePath, size };
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
