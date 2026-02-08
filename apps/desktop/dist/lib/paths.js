"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVaultyDataPath = getVaultyDataPath;
exports.getItemsFilePath = getItemsFilePath;
exports.getImagesPath = getImagesPath;
exports.getTrashPath = getTrashPath;
exports.getTrashFilePath = getTrashFilePath;
exports.getTrashImagesPath = getTrashImagesPath;
exports.getSettingsPath = getSettingsPath;
exports.getWebAppPath = getWebAppPath;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// Data storage paths
function getVaultyDataPath() {
    return path_1.default.join(electron_1.app.getPath("documents"), "vaulty");
}
function getItemsFilePath() {
    return path_1.default.join(getVaultyDataPath(), "items.json");
}
function getImagesPath() {
    return path_1.default.join(getVaultyDataPath(), "images");
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
function getSettingsPath() {
    return path_1.default.join(electron_1.app.getPath("userData"), "settings.json");
}
function getWebAppPath(isDev) {
    if (isDev)
        return path_1.default.join(__dirname, "..", "..", "..", "web");
    return path_1.default.join(process.resourcesPath, "web");
}
