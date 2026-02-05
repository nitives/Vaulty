import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";

// Use Electron's built-in property instead of electron-is-dev
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const DEV_SERVER_URL = "http://localhost:3000";
const PROD_SERVER_PORT = 3000;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Vaulty",
    titleBarStyle: "default",
    backgroundColor: "#1a1a1a",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      spellcheck: true,
    },
  });

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
