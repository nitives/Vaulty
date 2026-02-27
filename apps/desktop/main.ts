import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  shell,
  Tray,
  Menu,
} from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import fs from "fs";

import { getWebAppPath } from "./lib/paths";
import { loadSettings, applyTransparency } from "./lib/settings";
import { cleanupOldTrash } from "./lib/storage";
import { getWindowIcon } from "./lib/icon";
import {
  registerProtocolScheme,
  registerProtocolHandler,
} from "./lib/protocol";
import { registerIpcHandlers } from "./lib/ipc";
import { startLocalApi } from "./lib/api";
import { initVentricle, stopVentricle } from "./lib/ventricle";
import {
  canCheckForUpdates,
  checkForUpdates,
  downloadUpdate,
  getUpdateStatus,
  quitAndInstall,
  setupAutoUpdates,
} from "./lib/updates";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const DEV_SERVER_URL = "http://localhost:3000";
const PROD_SERVER_PORT = 3000;
let startupUpdateCheckRan = false;

let tray: Tray | null = null;
let isQuitting = false;

function createWindow(): void {
  const settings = loadSettings();

  mainWindow = new BrowserWindow({
    show: false,
    width: 1250,
    height: 750,
    minWidth: 660,
    minHeight: 360,
    title: "Vaulty",
    icon: getWindowIcon(settings.iconTheme),
    roundedCorners: true,
    titleBarStyle: "hidden",
    backgroundColor: "#1a1a1a",
    backgroundMaterial: "mica",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      spellcheck: true,
    },
  });

  // Apply saved settings on creation and after every page load (including refresh)
  const applySettings = () => {
    if (!mainWindow) return;
    const settings = loadSettings();
    if (settings.transparency) {
      applyTransparency(mainWindow, true, settings.backgroundMaterial);
    }
    if (settings.theme) {
      nativeTheme.themeSource = settings.theme;
    }
  };

  // Apply on initial creation
  applySettings();

  // Re-apply after page refresh (Ctrl+R)
  mainWindow.webContents.on("did-finish-load", applySettings);

  // Graceful window show to avoid white flash
  mainWindow.once("ready-to-show", () => {
    if (settings.startMinimized && !isDev) {
      // Don't show if we are meant to start minimized
    } else {
      mainWindow?.show();
    }
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      const currentSettings = loadSettings();
      if (currentSettings.closeToTray !== false) {
        event.preventDefault();
        mainWindow?.hide();
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const settings = loadSettings();
  const iconPath = path.join(
    __dirname,
    "..",
    "icons",
    "ico",
    "icon-rounded.ico",
  );

  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Vaulty",
      click: () => {
        if (!mainWindow) {
          createWindow();
        } else {
          mainWindow.show();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Vaulty");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    } else {
      createWindow();
    }
  });
}

async function startNextServer(): Promise<void> {
  if (isDev) return;

  return new Promise((resolve, reject) => {
    const webAppPath = getWebAppPath(isDev);
    let serverPath = path.join(webAppPath, ".next", "standalone", "server.js");
    const nestedServerPath = path.join(
      webAppPath,
      ".next",
      "standalone",
      "apps",
      "web",
      "server.js",
    );

    if (!fs.existsSync(serverPath) && fs.existsSync(nestedServerPath)) {
      serverPath = nestedServerPath;
    }
    nextServer = spawn(isDev ? "node" : process.execPath, [serverPath], {
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

async function loadApp(): Promise<void> {
  if (!mainWindow) return;

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
    } catch {
      console.log(
        `Waiting for Next.js server... attempt ${i + 1}/${maxRetries}`,
      );
      await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
    }
  }

  console.error("Failed to connect to Next.js server");
}

function registerUpdateIpcHandlers(): void {
  ipcMain.handle("updates:check", async () => {
    const result = await checkForUpdates();

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

  ipcMain.handle("updates:download", async () => {
    if (!canCheckForUpdates()) {
      return { ok: false, reason: "disabled-in-dev" };
    }

    try {
      await downloadUpdate();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("updates:install", () => {
    if (!canCheckForUpdates()) {
      return { ok: false, reason: "disabled-in-dev" };
    }

    quitAndInstall();
    return { ok: true };
  });

  ipcMain.handle("updates:status", () => getUpdateStatus());
}

// Register protocol scheme before app is ready
registerProtocolScheme();

// App lifecycle
app.whenReady().then(async () => {
  // Cleanup old trash items (older than 60 days)
  cleanupOldTrash();

  registerProtocolHandler();
  registerIpcHandlers(() => mainWindow);
  registerUpdateIpcHandlers();

  createWindow();
  createTray();
  setupAutoUpdates(
    () => mainWindow,
    () => {
      isQuitting = true;
    },
  );
  startLocalApi(() => mainWindow);
  try {
    await initVentricle({
      onNewPulseItem: (item) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("new-pulse-item", item);
        }
      },
    });
  } catch (error) {
    console.error("[Ventricle] Failed to initialize:", error);
  }
  await startNextServer();
  await loadApp();

  if (!startupUpdateCheckRan) {
    startupUpdateCheckRan = true;
    void checkForUpdates();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    setupAutoUpdates(
      () => mainWindow,
      () => {
        isQuitting = true;
      },
    );
    await loadApp();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopVentricle();
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});
