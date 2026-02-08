"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDataDirectories = ensureDataDirectories;
exports.loadItems = loadItems;
exports.saveItems = saveItems;
exports.saveImage = saveImage;
exports.loadTrash = loadTrash;
exports.saveTrash = saveTrash;
exports.moveToTrash = moveToTrash;
exports.restoreFromTrash = restoreFromTrash;
exports.permanentlyDeleteFromTrash = permanentlyDeleteFromTrash;
exports.emptyTrash = emptyTrash;
exports.cleanupOldTrash = cleanupOldTrash;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("./paths");
// Ensure data directories exist
function ensureDataDirectories() {
    const dataPath = (0, paths_1.getVaultyDataPath)();
    const imagesPath = (0, paths_1.getImagesPath)();
    const trashPath = (0, paths_1.getTrashPath)();
    const trashImagesPath = (0, paths_1.getTrashImagesPath)();
    if (!fs_1.default.existsSync(dataPath)) {
        fs_1.default.mkdirSync(dataPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(imagesPath)) {
        fs_1.default.mkdirSync(imagesPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(trashPath)) {
        fs_1.default.mkdirSync(trashPath, { recursive: true });
    }
    if (!fs_1.default.existsSync(trashImagesPath)) {
        fs_1.default.mkdirSync(trashImagesPath, { recursive: true });
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
        return JSON.parse(data);
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
function saveImage(imageData, filename) {
    try {
        ensureDataDirectories();
        const imagesPath = (0, paths_1.getImagesPath)();
        const filePath = path_1.default.join(imagesPath, filename);
        // imageData is base64 encoded
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        fs_1.default.writeFileSync(filePath, base64Data, "base64");
        return { success: true, path: filePath };
    }
    catch (err) {
        console.error("Failed to save image:", err);
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
    // Move image to trash folder if exists
    if (item.imageUrl) {
        const filename = item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
            const srcPath = path_1.default.join((0, paths_1.getImagesPath)(), filename);
            const destPath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
            if (fs_1.default.existsSync(srcPath)) {
                fs_1.default.renameSync(srcPath, destPath);
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
    // Move image back from trash folder if exists
    if (trashedItem.item.imageUrl) {
        const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
            const srcPath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
            const destPath = path_1.default.join((0, paths_1.getImagesPath)(), filename);
            if (fs_1.default.existsSync(srcPath)) {
                fs_1.default.renameSync(srcPath, destPath);
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
    // Delete image file if exists
    if (trashedItem.item.imageUrl) {
        const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
        if (filename) {
            const filePath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
    }
    trash.splice(index, 1);
    saveTrash(trash);
}
function emptyTrash() {
    const trash = loadTrash();
    // Delete all images in trash
    for (const trashedItem of trash) {
        if (trashedItem.item.imageUrl) {
            const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
            if (filename) {
                const filePath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
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
            // Delete image file if exists
            if (trashedItem.item.imageUrl) {
                const filename = trashedItem.item.imageUrl.split(/[\\/]/).pop();
                if (filename) {
                    const filePath = path_1.default.join((0, paths_1.getTrashImagesPath)(), filename);
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
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
