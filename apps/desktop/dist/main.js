"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
// Use Electron's built-in property instead of electron-is-dev
const isDev = !electron_1.app.isPackaged;
let mainWindow = null;
let nextServer = null;
const DEV_SERVER_URL = "http://localhost:3000";
const PROD_SERVER_PORT = 3000;
function getSettingsPath() {
    return path_1.default.join(electron_1.app.getPath("userData"), "settings.json");
}
function loadSettings() {
    try {
        return JSON.parse(fs_1.default.readFileSync(getSettingsPath(), "utf-8"));
    }
    catch {
        return {};
    }
}
function saveSettings(settings) {
    fs_1.default.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}
function applyTransparency(win, enabled, material) {
    const mat = material ?? "mica";
    if (enabled) {
        win.setBackgroundColor("#00000000");
        // setBackgroundMaterial is available on Windows 11+
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
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        show: false,
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        title: "Vaulty",
        roundedCorners: true,
        titleBarStyle: "hidden",
        backgroundColor: "#1a1a1a",
        backgroundMaterial: "mica",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
            spellcheck: true,
        },
    });
    // Apply saved transparency setting on creation
    const settings = loadSettings();
    if (settings.transparency) {
        applyTransparency(mainWindow, true, settings.backgroundMaterial);
    }
    // Apply saved theme so acrylic/mica tint is correct at launch
    if (settings.theme) {
        electron_1.nativeTheme.themeSource = settings.theme;
    }
    // Graceful window show to avoid white flash
    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
    });
    // Handle external links - open in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            electron_1.shell.openExternal(url);
        }
        return { action: "deny" };
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
async function startNextServer() {
    if (isDev) {
        // In development, Next.js dev server runs via npm run dev:web
        return;
    }
    // In production, start the Next.js standalone server
    return new Promise((resolve, reject) => {
        const webAppPath = getWebAppPath();
        const serverPath = path_1.default.join(webAppPath, ".next", "standalone", "server.js");
        nextServer = (0, child_process_1.spawn)("node", [serverPath], {
            cwd: webAppPath,
            env: {
                ...process.env,
                PORT: String(PROD_SERVER_PORT),
                HOSTNAME: "localhost",
            },
            stdio: "pipe",
        });
        nextServer.stdout?.on("data", (data) => {
            const output = data.toString();
            console.log("[Next.js]", output);
            if (output.includes("Ready") || output.includes("started")) {
                resolve();
            }
        });
        nextServer.stderr?.on("data", (data) => {
            console.error("[Next.js Error]", data.toString());
        });
        nextServer.on("error", reject);
        // Fallback resolve after timeout
        setTimeout(resolve, 3000);
    });
}
async function loadApp() {
    if (!mainWindow)
        return;
    const serverUrl = isDev
        ? DEV_SERVER_URL
        : `http://localhost:${PROD_SERVER_PORT}`;
    // Retry loading with exponential backoff
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
        try {
            await mainWindow.loadURL(serverUrl);
            if (isDev) {
                mainWindow.webContents.openDevTools({ mode: "detach" });
            }
            return;
        }
        catch (err) {
            console.log(`Waiting for Next.js server... attempt ${i + 1}/${maxRetries}`);
            await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
        }
    }
    console.error("Failed to connect to Next.js server");
}
function getWebAppPath() {
    // dev: repo layout
    if (isDev)
        return path_1.default.join(__dirname, "..", "..", "web");
    // prod: bundled resources
    return path_1.default.join(process.resourcesPath, "web");
}
// App lifecycle
electron_1.app.whenReady().then(async () => {
    createWindow();
    await startNextServer();
    await loadApp();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", async () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        await loadApp();
    }
});
electron_1.app.on("before-quit", () => {
    // Clean up Next.js server process
    if (nextServer) {
        nextServer.kill();
        nextServer = null;
    }
});
// IPC handlers for renderer communication
electron_1.ipcMain.handle("app:version", () => electron_1.app.getVersion());
electron_1.ipcMain.handle("app:name", () => electron_1.app.getName());
// Window control IPC handlers
electron_1.ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.handle("window:close", () => {
    mainWindow?.close();
});
electron_1.ipcMain.handle("window:isMaximized", () => {
    return mainWindow?.isMaximized() ?? false;
});
// Transparency / settings IPC handlers
electron_1.ipcMain.handle("settings:get", () => {
    return loadSettings();
});
electron_1.ipcMain.handle("settings:set", (_event, patch) => {
    const settings = loadSettings();
    const updated = { ...settings, ...patch };
    saveSettings(updated);
    // Apply side-effects for settings that need native calls
    if (mainWindow &&
        ("transparency" in patch || "backgroundMaterial" in patch)) {
        applyTransparency(mainWindow, updated.transparency ?? false, updated.backgroundMaterial);
    }
    return updated;
});
// Theme IPC handler -- syncs nativeTheme so acrylic/mica tints match
electron_1.ipcMain.handle("theme:set", (_event, theme) => {
    electron_1.nativeTheme.themeSource = theme;
});
