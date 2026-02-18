"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const paths_1 = require("./lib/paths");
const settings_1 = require("./lib/settings");
const storage_1 = require("./lib/storage");
const icon_1 = require("./lib/icon");
const protocol_1 = require("./lib/protocol");
const ipc_1 = require("./lib/ipc");
const isDev = !electron_1.app.isPackaged;
let mainWindow = null;
let nextServer = null;
const DEV_SERVER_URL = "http://localhost:3000";
const PROD_SERVER_PORT = 3000;
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
// Register protocol scheme before app is ready
(0, protocol_1.registerProtocolScheme)();
// App lifecycle
electron_1.app.whenReady().then(async () => {
    // Cleanup old trash items (older than 60 days)
    (0, storage_1.cleanupOldTrash)();
    (0, protocol_1.registerProtocolHandler)();
    (0, ipc_1.registerIpcHandlers)(() => mainWindow);
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
    if (nextServer) {
        nextServer.kill();
        nextServer = null;
    }
});
