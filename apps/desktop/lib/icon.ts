import { app, nativeImage } from "electron";
import path from "path";

export type AppIconTheme =
  | "default"
  | "dev"
  | "dawn"
  | "sunset"
  | "midnight"
  | "inverted";

const DEFAULT_ICON_THEME: AppIconTheme = "default";

/**
 * In production the icons live in the asarUnpack directory on the real
 * filesystem, NOT inside the asar archive.  nativeImage.createFromPath
 * cannot reliably read .ico files from inside asar on Windows, so we
 * resolve to the unpacked path when the app is packaged.
 */
function getIconsBaseDir(): string {
  const appPath = app.getAppPath();
  // When packaged the appPath is e.g. "…/resources/app.asar"
  const resolvedPath =
    app.isPackaged && appPath.endsWith("app.asar")
      ? path.join(path.dirname(appPath), "app.asar.unpacked")
      : appPath;
  return path.join(resolvedPath, "icons");
}

export function resolveIconTheme(theme?: string): AppIconTheme {
  if (
    theme === "default" ||
    theme === "dev" ||
    theme === "dawn" ||
    theme === "sunset" ||
    theme === "midnight" ||
    theme === "inverted"
  ) {
    return theme;
  }
  // Backward compatibility for previously saved values.
  if (theme === "rounded") return "default";
  if (theme === "dev-dawn") return "dawn";
  if (theme === "dev-night") return "default";
  if (theme === "dev-sunset") return "sunset";
  if (theme === "dev-midnight") return "midnight";
  if (theme === "dev-inverted") return "inverted";
  return DEFAULT_ICON_THEME;
}

function getIconCandidates(theme: AppIconTheme): string[] {
  const baseDir = getIconsBaseDir();
  const themeName = `icon-${theme}`;
  const roundedThemeName = `${themeName}-rounded`;

  if (process.platform === "win32") {
    return [
      path.join(baseDir, "ico", `${roundedThemeName}.ico`),
      path.join(baseDir, "ico", `${themeName}.ico`),
      path.join(baseDir, "png", `${roundedThemeName}.png`),
      path.join(baseDir, "png", `${themeName}.png`),
    ];
  }

  if (process.platform === "darwin") {
    return [
      path.join(baseDir, "macos", `icon-macos-${theme}.png`),
      path.join(baseDir, "png", `${roundedThemeName}.png`),
      path.join(baseDir, "png", `${themeName}.png`),
    ];
  }

  return [
    path.join(baseDir, "png", `${roundedThemeName}.png`),
    path.join(baseDir, "png", `${themeName}.png`),
  ];
}

function getGenericIconCandidates(): string[] {
  const baseDir = getIconsBaseDir();
  if (process.platform === "win32") {
    return [
      path.join(baseDir, "ico", "icon-default-rounded.ico"),
      path.join(baseDir, "ico", "icon-default.ico"),
      path.join(baseDir, "png", "icon-default-rounded.png"),
      path.join(baseDir, "png", "icon-default.png"),
    ];
  }
  if (process.platform === "darwin") {
    return [
      path.join(baseDir, "macos", "icon-macos-default.png"),
      path.join(baseDir, "png", "icon-default-rounded.png"),
      path.join(baseDir, "png", "icon-default.png"),
    ];
  }
  return [
    path.join(baseDir, "png", "icon-default-rounded.png"),
    path.join(baseDir, "png", "icon-default.png"),
  ];
}

export function getWindowIcon(theme?: string) {
  const resolvedTheme = resolveIconTheme(theme);
  const iconPaths = Array.from(new Set([
    ...getIconCandidates(resolvedTheme),
    ...getIconCandidates(DEFAULT_ICON_THEME),
    ...getGenericIconCandidates(),
  ]));

  for (const iconPath of iconPaths) {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      return icon;
    }
  }
  return undefined;
}
