"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSettings = loadSettings;
exports.saveSettings = saveSettings;
exports.applyTransparency = applyTransparency;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("./paths");
function readSettingsFile() {
    try {
        return JSON.parse(fs_1.default.readFileSync((0, paths_1.getSettingsPath)(), "utf-8"));
    }
    catch {
        return {};
    }
}
function readCustomCssContent() {
    try {
        const customCssPath = (0, paths_1.getCustomCssFilePath)();
        if (!fs_1.default.existsSync(customCssPath)) {
            return "";
        }
        return fs_1.default.readFileSync(customCssPath, "utf-8");
    }
    catch {
        return "";
    }
}
function writeCustomCssContent(content) {
    const customCssPath = (0, paths_1.getCustomCssFilePath)();
    fs_1.default.mkdirSync(path_1.default.dirname(customCssPath), { recursive: true });
    fs_1.default.writeFileSync(customCssPath, content);
}
function withoutCustomCssContent(settings) {
    const copy = { ...settings };
    delete copy.customCSSContent;
    return copy;
}
function loadSettings() {
    const settings = readSettingsFile();
    const legacyCustomCss = typeof settings.customCSSContent === "string" ? settings.customCSSContent : "";
    const customCssContent = readCustomCssContent() || legacyCustomCss;
    if (legacyCustomCss && !readCustomCssContent()) {
        try {
            writeCustomCssContent(legacyCustomCss);
        }
        catch {
            // Leave migration best-effort; the legacy value is still returned below.
        }
    }
    return {
        ...withoutCustomCssContent(settings),
        customCSSContent: customCssContent,
    };
}
function saveSettings(settings) {
    fs_1.default.writeFileSync((0, paths_1.getSettingsPath)(), JSON.stringify(withoutCustomCssContent(settings), null, 2));
    if (typeof settings.customCSSContent === "string") {
        writeCustomCssContent(settings.customCSSContent);
    }
}
function applyTransparency(win, enabled, material) {
    const mat = material ?? "mica";
    if (enabled) {
        win.setBackgroundColor("#00000000");
        if (process.platform === "win32") {
            win.setBackgroundMaterial(mat);
            console.log(`Applied ${mat} background on Windows`);
        }
        else if (process.platform === "darwin") {
            win.setVibrancy("under-window");
            console.log("Applied vibrancy on macOS");
        }
    }
    else {
        win.setBackgroundColor("#1a1a1a");
        if (process.platform === "win32") {
            win.setBackgroundMaterial("none");
            console.log("Removed transparent background on Windows");
        }
        else if (process.platform === "darwin") {
            win.setVibrancy(null);
            console.log("Removed vibrancy on macOS");
        }
    }
}
