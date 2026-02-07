import { app, BrowserWindow, ipcMain, nativeTheme, shell } from "electron";
import path from "path";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";

// Use Electron's built-in property instead of electron-is-dev
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const DEV_SERVER_URL = "http://localhost:3000";
const PROD_SERVER_PORT = 3000;

// Simple settings persistence
type BackgroundMaterial = "mica" | "acrylic";

interface AppSettings {
  transparency?: boolean;
  backgroundMaterial?: BackgroundMaterial;
  theme?: "system" | "light" | "dark";
  compactMode?: boolean;
  startCollapsed?: boolean;
  confirmBeforeDelete?: boolean;
}

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings(): AppSettings {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

function applyTransparency(
  win: BrowserWindow,
  enabled: boolean,
  material?: BackgroundMaterial,
): void {
  const mat = material ?? "mica";
  if (enabled) {
    win.setBackgroundColor("#00000000");
    // setBackgroundMaterial is available on Windows 11+
    if (process.platform === "win32") {
      (win as any).setBackgroundMaterial(mat);
      console.log(`Applied ${mat} background on Windows`);
    }
  } else {
    win.setBackgroundColor("#1a1a1a");
    if (process.platform === "win32") {
      (win as any).setBackgroundMaterial("none");
      console.log("Removed transparent background on Windows");
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, "preload.js"),
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
    nativeTheme.themeSource = settings.theme;
  }

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
  if (isDev) {
    // In development, Next.js dev server runs via npm run dev:web
    return;
  }

  // In production, start the Next.js standalone server
  return new Promise((resolve, reject) => {
    const webAppPath = getWebAppPath();
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

    // Fallback resolve after timeout
    setTimeout(resolve, 3000);
  });
}

async function loadApp(): Promise<void> {
  if (!mainWindow) return;

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
    } catch (err) {
      console.log(
        `Waiting for Next.js server... attempt ${i + 1}/${maxRetries}`,
      );
      await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
    }
  }

  console.error("Failed to connect to Next.js server");
}

function getWebAppPath() {
  // dev: repo layout
  if (isDev) return path.join(__dirname, "..", "..", "web");
  // prod: bundled resources
  return path.join(process.resourcesPath, "web");
}

// App lifecycle
app.whenReady().then(async () => {
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
  // Clean up Next.js server process
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});

// IPC handlers for renderer communication
ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("app:name", () => app.getName());

// Window control IPC handlers
ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
});

ipcMain.handle("window:isMaximized", () => {
  return mainWindow?.isMaximized() ?? false;
});

// Transparency / settings IPC handlers
ipcMain.handle("settings:get", () => {
  return loadSettings();
});

ipcMain.handle("settings:set", (_event, patch: Partial<AppSettings>) => {
  const settings = loadSettings();
  const updated = { ...settings, ...patch };
  saveSettings(updated);

  // Apply side-effects for settings that need native calls
  if (
    mainWindow &&
    ("transparency" in patch || "backgroundMaterial" in patch)
  ) {
    applyTransparency(
      mainWindow,
      updated.transparency ?? false,
      updated.backgroundMaterial,
    );
  }

  return updated;
});

// Theme IPC handler -- syncs nativeTheme so acrylic/mica tints match
ipcMain.handle("theme:set", (_event, theme: "system" | "light" | "dark") => {
  nativeTheme.themeSource = theme;
});
