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
/**
 * In production the icons live in the asarUnpack directory on the real
 * filesystem, NOT inside the asar archive.  nativeImage.createFromPath
 * cannot reliably read .ico files from inside asar on Windows, so we
 * resolve to the unpacked path when the app is packaged.
 */
function getIconsBaseDir() {
    const appPath = electron_1.app.getAppPath();
    // When packaged the appPath is e.g. "…/resources/app.asar"
    const resolvedPath = electron_1.app.isPackaged && appPath.endsWith("app.asar")
        ? path_1.default.join(path_1.default.dirname(appPath), "app.asar.unpacked")
        : appPath;
    return path_1.default.join(resolvedPath, "icons");
}
function resolveIconTheme(theme) {
    if (theme === "default" ||
        theme === "dev" ||
        theme === "dawn" ||
        theme === "sunset" ||
        theme === "midnight" ||
        theme === "inverted") {
        return theme;
    }
    // Backward compatibility for previously saved values.
    if (theme === "rounded")
        return "default";
    if (theme === "dev-dawn")
        return "dawn";
    if (theme === "dev-night")
        return "default";
    if (theme === "dev-sunset")
        return "sunset";
    if (theme === "dev-midnight")
        return "midnight";
    if (theme === "dev-inverted")
        return "inverted";
    return DEFAULT_ICON_THEME;
}
function getIconCandidates(theme) {
    const baseDir = getIconsBaseDir();
    const themeName = `icon-${theme}`;
    const roundedThemeName = `${themeName}-rounded`;
    if (process.platform === "win32") {
        return [
            path_1.default.join(baseDir, "ico", `${roundedThemeName}.ico`),
            path_1.default.join(baseDir, "ico", `${themeName}.ico`),
            path_1.default.join(baseDir, "png", `${roundedThemeName}.png`),
            path_1.default.join(baseDir, "png", `${themeName}.png`),
        ];
    }
    if (process.platform === "darwin") {
        return [
            path_1.default.join(baseDir, "macos", `icon-macos-${theme}.png`),
            path_1.default.join(baseDir, "png", `${roundedThemeName}.png`),
            path_1.default.join(baseDir, "png", `${themeName}.png`),
        ];
    }
    return [
        path_1.default.join(baseDir, "png", `${roundedThemeName}.png`),
        path_1.default.join(baseDir, "png", `${themeName}.png`),
    ];
}
function getGenericIconCandidates() {
    const baseDir = getIconsBaseDir();
    if (process.platform === "win32") {
        return [
            path_1.default.join(baseDir, "ico", "icon-default-rounded.ico"),
            path_1.default.join(baseDir, "ico", "icon-default.ico"),
            path_1.default.join(baseDir, "png", "icon-default-rounded.png"),
            path_1.default.join(baseDir, "png", "icon-default.png"),
        ];
    }
    if (process.platform === "darwin") {
        return [
            path_1.default.join(baseDir, "macos", "icon-macos-default.png"),
            path_1.default.join(baseDir, "png", "icon-default-rounded.png"),
            path_1.default.join(baseDir, "png", "icon-default.png"),
        ];
    }
    return [
        path_1.default.join(baseDir, "png", "icon-default-rounded.png"),
        path_1.default.join(baseDir, "png", "icon-default.png"),
    ];
}
function getWindowIcon(theme) {
    const resolvedTheme = resolveIconTheme(theme);
    const iconPaths = Array.from(new Set([
        ...getIconCandidates(resolvedTheme),
        ...getIconCandidates(DEFAULT_ICON_THEME),
        ...getGenericIconCandidates(),
    ]));
    for (const iconPath of iconPaths) {
        const icon = electron_1.nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
            return icon;
        }
    }
    return undefined;
}
