import { app, BrowserWindow, nativeTheme, shell } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";

import { getWebAppPath } from "./lib/paths";
import { loadSettings, applyTransparency } from "./lib/settings";
import { cleanupOldTrash } from "./lib/storage";
import {
  registerProtocolScheme,
  registerProtocolHandler,
} from "./lib/protocol";
import { registerIpcHandlers } from "./lib/ipc";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const DEV_SERVER_URL = "http://localhost:3000";
const PROD_SERVER_PORT = 3000;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    show: false,
    width: 1250,
    height: 750,
    minWidth: 300,
    minHeight: 200,
    title: "Vaulty",
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
    mainWindow?.show();
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function startNextServer(): Promise<void> {
  if (isDev) return;

  return new Promise((resolve, reject) => {
    const webAppPath = getWebAppPath(isDev);
    const serverPath = path.join(
      webAppPath,
      ".next",
      "standalone",
      "server.js",
    );

    nextServer = spawn("node", [serverPath], {
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

// Register protocol scheme before app is ready
registerProtocolScheme();

// App lifecycle
app.whenReady().then(async () => {
  // Cleanup old trash items (older than 60 days)
  cleanupOldTrash();

  registerProtocolHandler();
  registerIpcHandlers(() => mainWindow);

  createWindow();
  await startNextServer();
  await loadApp();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    await loadApp();
  }
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});
