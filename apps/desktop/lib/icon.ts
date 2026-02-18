import { app, nativeImage } from "electron";
import path from "path";

export type AppIconTheme = "default" | "dev" | "dawn";

const DEFAULT_ICON_THEME: AppIconTheme = "default";

const ICON_BASE_NAME_BY_THEME: Record<AppIconTheme, string> = {
  default: "icon-rounded",
  dev: "icon-dev-rounded",
  dawn: "icon-dawn-rounded",
};

export function resolveIconTheme(theme?: string): AppIconTheme {
  if (theme === "default" || theme === "dev" || theme === "dawn") {
    return theme;
  }
  // Backward compatibility for previously saved values.
  if (theme === "rounded") return "default";
  if (theme === "dev-dawn") return "dawn";
  if (theme === "dev-night") return "default";
  return DEFAULT_ICON_THEME;
}

function getIconCandidates(theme: AppIconTheme): string[] {
  const baseName = ICON_BASE_NAME_BY_THEME[theme];
  const baseDir = path.join(app.getAppPath(), "icons");

  // On Windows, try ICO first, then PNG fallback.
  if (process.platform === "win32") {
    return [
      path.join(baseDir, "ico", `${baseName}.ico`),
      path.join(baseDir, "png", `${baseName}.png`),
    ];
  }

  return [path.join(baseDir, "png", `${baseName}.png`)];
}

function getGenericIconCandidates(): string[] {
  const baseDir = path.join(app.getAppPath(), "icons");
  if (process.platform === "win32") {
    return [
      path.join(baseDir, "ico", "icon.ico"),
      path.join(baseDir, "png", "icon.png"),
    ];
  }
  return [path.join(baseDir, "png", "icon.png")];
}

export function getWindowIcon(theme?: string) {
  const resolvedTheme = resolveIconTheme(theme);
  const iconPaths = [
    ...getIconCandidates(resolvedTheme),
    ...getIconCandidates(DEFAULT_ICON_THEME),
    ...getGenericIconCandidates(),
  ];

  for (const iconPath of iconPaths) {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      return icon;
    }
  }
  return undefined;
}
