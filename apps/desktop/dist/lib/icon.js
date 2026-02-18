"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIconTheme = resolveIconTheme;
exports.getWindowIcon = getWindowIcon;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const DEFAULT_ICON_THEME = "default";
const ICON_BASE_NAME_BY_THEME = {
    default: "icon-rounded",
    dev: "icon-dev-rounded",
    dawn: "icon-dawn-rounded",
};
function resolveIconTheme(theme) {
    if (theme === "default" || theme === "dev" || theme === "dawn") {
        return theme;
    }
    // Backward compatibility for previously saved values.
    if (theme === "rounded")
        return "default";
    if (theme === "dev-dawn")
        return "dawn";
    if (theme === "dev-night")
        return "default";
    return DEFAULT_ICON_THEME;
}
function getIconCandidates(theme) {
    const baseName = ICON_BASE_NAME_BY_THEME[theme];
    const baseDir = path_1.default.join(electron_1.app.getAppPath(), "icons");
    // On Windows, try ICO first, then PNG fallback.
    if (process.platform === "win32") {
        return [
            path_1.default.join(baseDir, "ico", `${baseName}.ico`),
            path_1.default.join(baseDir, "png", `${baseName}.png`),
        ];
    }
    return [path_1.default.join(baseDir, "png", `${baseName}.png`)];
}
function getGenericIconCandidates() {
    const baseDir = path_1.default.join(electron_1.app.getAppPath(), "icons");
    if (process.platform === "win32") {
        return [
            path_1.default.join(baseDir, "ico", "icon.ico"),
            path_1.default.join(baseDir, "png", "icon.png"),
        ];
    }
    return [path_1.default.join(baseDir, "png", "icon.png")];
}
function getWindowIcon(theme) {
    const resolvedTheme = resolveIconTheme(theme);
    const iconPaths = [
        ...getIconCandidates(resolvedTheme),
        ...getIconCandidates(DEFAULT_ICON_THEME),
        ...getGenericIconCandidates(),
    ];
    for (const iconPath of iconPaths) {
        const icon = electron_1.nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
            return icon;
        }
    }
    return undefined;
}
