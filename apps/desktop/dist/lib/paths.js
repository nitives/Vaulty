"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVaultyDataPath = getVaultyDataPath;
exports.getItemsFilePath = getItemsFilePath;
exports.getFoldersFilePath = getFoldersFilePath;
exports.getPagesFilePath = getPagesFilePath;
exports.getImagesPath = getImagesPath;
exports.getAudiosPath = getAudiosPath;
exports.getTrashPath = getTrashPath;
exports.getTrashFilePath = getTrashFilePath;
exports.getTrashImagesPath = getTrashImagesPath;
exports.getTrashAudiosPath = getTrashAudiosPath;
exports.getSettingsPath = getSettingsPath;
exports.getLegacyPulsesConfigPath = getLegacyPulsesConfigPath;
exports.getPulsesConfigPath = getPulsesConfigPath;
exports.getPulsesFilePath = getPulsesFilePath;
exports.getPulseItemsFilePath = getPulseItemsFilePath;
exports.getWebAppPath = getWebAppPath;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Data storage paths
function getVaultyDataPath() {
    try {
        const settingsPath = getSettingsPath();
        if (fs_1.default.existsSync(settingsPath)) {
            const data = fs_1.default.readFileSync(settingsPath, "utf-8");
            const settings = JSON.parse(data);
            if (settings.vaultyDataPath) {
                return settings.vaultyDataPath;
            }
        }
    }
    catch (e) {
        // Fall back to default if parsing fails
    }
    return path_1.default.join(electron_1.app.getPath("documents"), "vaulty");
}
function getItemsFilePath() {
    return path_1.default.join(getVaultyDataPath(), "items.json");
}
function getFoldersFilePath() {
    return path_1.default.join(getVaultyDataPath(), "folders.json");
}
function getPagesFilePath() {
    return path_1.default.join(getVaultyDataPath(), "pages.json");
}
function getImagesPath() {
    return path_1.default.join(getVaultyDataPath(), "images");
}
function getAudiosPath() {
    return path_1.default.join(getVaultyDataPath(), "audios");
}
function getTrashPath() {
    return path_1.default.join(getVaultyDataPath(), "trash");
}
function getTrashFilePath() {
    return path_1.default.join(getTrashPath(), "trash.json");
}
function getTrashImagesPath() {
    return path_1.default.join(getTrashPath(), "images");
}
function getTrashAudiosPath() {
    return path_1.default.join(getTrashPath(), "audios");
}
function getSettingsPath() {
    return path_1.default.join(electron_1.app.getPath("userData"), "settings.json");
}
function getLegacyPulsesConfigPath() {
    return path_1.default.join(electron_1.app.getPath("userData"), "pulses");
}
function getPulsesConfigPath() {
    return path_1.default.join(getVaultyDataPath(), "pulses");
}
function getPulsesFilePath() {
    return path_1.default.join(getVaultyDataPath(), "pulses.json");
}
function getPulseItemsFilePath() {
    return path_1.default.join(getVaultyDataPath(), "pulseItems.json");
}
function getWebAppPath(isDev) {
    if (isDev)
        return path_1.default.join(__dirname, "..", "..", "..", "web");
    return path_1.default.join(process.resourcesPath, "web");
}
