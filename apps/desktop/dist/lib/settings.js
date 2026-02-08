"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSettings = loadSettings;
exports.saveSettings = saveSettings;
exports.applyTransparency = applyTransparency;
const fs_1 = __importDefault(require("fs"));
const paths_1 = require("./paths");
function loadSettings() {
    try {
        return JSON.parse(fs_1.default.readFileSync((0, paths_1.getSettingsPath)(), "utf-8"));
    }
    catch {
        return {};
    }
}
function saveSettings(settings) {
    fs_1.default.writeFileSync((0, paths_1.getSettingsPath)(), JSON.stringify(settings, null, 2));
}
function applyTransparency(win, enabled, material) {
    const mat = material ?? "mica";
    if (enabled) {
        win.setBackgroundColor("#00000000");
        if (process.platform === "win32") {
            win.setBackgroundMaterial(mat);
            console.log(`Applied ${mat} background on Windows`);
        }
    }
    else {
        win.setBackgroundColor("#1a1a1a");
        if (process.platform === "win32") {
            win.setBackgroundMaterial("none");
            console.log("Removed transparent background on Windows");
        }
    }
}
