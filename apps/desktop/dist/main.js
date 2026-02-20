"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const paths_1 = require("./lib/paths");
const settings_1 = require("./lib/settings");
const storage_1 = require("./lib/storage");
const icon_1 = require("./lib/icon");
const protocol_1 = require("./lib/protocol");
const ipc_1 = require("./lib/ipc");
const updates_1 = require("./lib/updates");
const isDev = !electron_1.app.isPackaged;
let mainWindow = null;
let nextServer = null;
const DEV_SERVER_URL = "http://localhost:3000";
const PROD_SERVER_PORT = 3000;
let startupUpdateCheckRan = false;
function createWindow() {
    const settings = (0, settings_1.loadSettings)();
    mainWindow = new electron_1.BrowserWindow({
        show: false,
        width: 1250,
        height: 750,
        minWidth: 300,
        minHeight: 200,
        title: "Vaulty",
        icon: (0, icon_1.getWindowIcon)(settings.iconTheme),
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
    // Apply saved settings on creation and after every page load (including refresh)
    const applySettings = () => {
        if (!mainWindow)
            return;
        const settings = (0, settings_1.loadSettings)();
        if (settings.transparency) {
            (0, settings_1.applyTransparency)(mainWindow, true, settings.backgroundMaterial);
        }
        if (settings.theme) {
            electron_1.nativeTheme.themeSource = settings.theme;
        }
    };
    // Apply on initial creation
    applySettings();
    // Re-apply after page refresh (Ctrl+R)
    mainWindow.webContents.on("did-finish-load", applySettings);
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
    if (isDev)
        return;
    return new Promise((resolve, reject) => {
        const webAppPath = (0, paths_1.getWebAppPath)(isDev);
        let serverPath = path_1.default.join(webAppPath, ".next", "standalone", "server.js");
        const nestedServerPath = path_1.default.join(webAppPath, ".next", "standalone", "apps", "web", "server.js");
        if (!fs_1.default.existsSync(serverPath) && fs_1.default.existsSync(nestedServerPath)) {
            serverPath = nestedServerPath;
        }
        nextServer = (0, child_process_1.spawn)(isDev ? "node" : process.execPath, [serverPath], {
            cwd: webAppPath,
            env: {
                ...process.env,
                ...(isDev ? {} : { ELECTRON_RUN_AS_NODE: "1" }),
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
        setTimeout(resolve, 3000);
    });
}
async function loadApp() {
    if (!mainWindow)
        return;
    const serverUrl = isDev
        ? DEV_SERVER_URL
        : `http://localhost:${PROD_SERVER_PORT}`;
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
        try {
            await mainWindow.loadURL(serverUrl);
            if (isDev) {
                mainWindow.webContents.openDevTools({ mode: "detach" });
            }
            return;
        }
        catch {
            console.log(`Waiting for Next.js server... attempt ${i + 1}/${maxRetries}`);
            await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
        }
    }
    console.error("Failed to connect to Next.js server");
}
function registerUpdateIpcHandlers() {
    electron_1.ipcMain.handle("updates:check", async () => {
        const result = await (0, updates_1.checkForUpdates)();
        if (result.status === "disabled-in-dev") {
            return { ok: false, reason: "disabled-in-dev" };
        }
        if (result.status === "busy") {
            return { ok: false, reason: "busy" };
        }
        if (result.status === "error") {
            return { ok: false, reason: "error" };
        }
        return {
            ok: true,
            status: result.status,
            version: result.version,
        };
    });
    electron_1.ipcMain.handle("updates:download", async () => {
        if (!(0, updates_1.canCheckForUpdates)()) {
            return { ok: false, reason: "disabled-in-dev" };
        }
        try {
            await (0, updates_1.downloadUpdate)();
            return { ok: true };
        }
        catch (error) {
            return {
                ok: false,
                reason: "error",
                message: error instanceof Error ? error.message : String(error),
            };
        }
    });
    electron_1.ipcMain.handle("updates:install", () => {
        if (!(0, updates_1.canCheckForUpdates)()) {
            return { ok: false, reason: "disabled-in-dev" };
        }
        (0, updates_1.quitAndInstall)();
        return { ok: true };
    });
    electron_1.ipcMain.handle("updates:status", () => (0, updates_1.getUpdateStatus)());
}
// Register protocol scheme before app is ready
(0, protocol_1.registerProtocolScheme)();
// App lifecycle
electron_1.app.whenReady().then(async () => {
    // Cleanup old trash items (older than 60 days)
    (0, storage_1.cleanupOldTrash)();
    (0, protocol_1.registerProtocolHandler)();
    (0, ipc_1.registerIpcHandlers)(() => mainWindow);
    registerUpdateIpcHandlers();
    createWindow();
    (0, updates_1.setupAutoUpdates)(() => mainWindow);
    await startNextServer();
    await loadApp();
    if (!startupUpdateCheckRan) {
        startupUpdateCheckRan = true;
        void (0, updates_1.checkForUpdates)();
    }
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", async () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        (0, updates_1.setupAutoUpdates)(() => mainWindow);
        await loadApp();
    }
});
electron_1.app.on("before-quit", () => {
    if (nextServer) {
        nextServer.kill();
        nextServer = null;
    }
});
