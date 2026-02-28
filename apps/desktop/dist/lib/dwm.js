"use strict";
/**
 * dwm.ts – Direct DWM API calls via koffi FFI.
 *
 * Fixes the Windows 11 bug where exiting maximized/fullscreen state
 * causes Chromium to reset window style flags, which detaches:
 *   1. DWM border radius  (DWMWA_WINDOW_CORNER_PREFERENCE)
 *   2. DWM backdrop material (DWMWA_SYSTEMBACKDROP_TYPE)
 *
 * We re-apply them via DwmSetWindowAttribute after every state transition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreDwmAttributes = restoreDwmAttributes;
exports.clearDwmBackdrop = clearDwmBackdrop;
// ── DWM constants ───────────────────────────────────────────────────────
const DWMWA_WINDOW_CORNER_PREFERENCE = 33;
const DWMWCP_ROUND = 2;
const DWMWA_SYSTEMBACKDROP_TYPE = 38;
const DWMSBT_AUTO = 0;
const DWMSBT_NONE = 1;
const DWMSBT_MAINWINDOW = 2; // Mica
const DWMSBT_TRANSIENTWINDOW = 3; // Acrylic
// DWM_BLURBEHIND flags
const DWM_BB_ENABLE = 0x00000001;
// ── FFI setup ───────────────────────────────────────────────────────────
let dwmSetWindowAttribute = null;
let dwmEnableBlurBehindWindow = null;
function ensureFFI() {
    if (dwmSetWindowAttribute)
        return true;
    if (process.platform !== "win32")
        return false;
    try {
        const koffi = require("koffi");
        const dwmapi = koffi.load("dwmapi.dll");
        // Use `intptr` for HWND so we pass the decoded pointer value directly.
        dwmSetWindowAttribute = dwmapi.func("int32 __stdcall DwmSetWindowAttribute(intptr hwnd, uint32 dwAttribute, void *pvAttribute, uint32 cbAttribute)");
        // DwmEnableBlurBehindWindow(HWND hWnd, const DWM_BLURBEHIND *pBlurBehind)
        // DWM_BLURBEHIND is a 16-byte struct: { DWORD dwFlags, BOOL fEnable, HRGN hRgnBlur, BOOL fTransitionOnMaximized }
        dwmEnableBlurBehindWindow = dwmapi.func("int32 __stdcall DwmEnableBlurBehindWindow(intptr hwnd, void *pBlurBehind)");
        console.log("[DWM] koffi FFI initialised — dwmapi.dll loaded");
        return true;
    }
    catch (err) {
        console.error("[DWM] Failed to load koffi/dwmapi.dll:", err);
        return false;
    }
}
// ── Helpers ─────────────────────────────────────────────────────────────
function readHwnd(buf) {
    if (process.arch === "x64" || process.arch === "arm64") {
        return buf.readBigUInt64LE(0);
    }
    return buf.readUInt32LE(0);
}
function setDwmUint32(hwnd, attr, value) {
    if (!dwmSetWindowAttribute)
        return;
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(value);
    const hr = dwmSetWindowAttribute(hwnd, attr, buf, 4);
    if (hr !== 0) {
        console.warn(`[DWM] DwmSetWindowAttribute(${attr}) returned HRESULT 0x${(hr >>> 0).toString(16)}`);
    }
}
function enableBlurBehind(hwnd) {
    if (!dwmEnableBlurBehindWindow)
        return;
    // DWM_BLURBEHIND struct (16 bytes):
    //   DWORD dwFlags           (4 bytes) – DWM_BB_ENABLE
    //   BOOL  fEnable           (4 bytes) – TRUE (1)
    //   HRGN  hRgnBlur          (4/8 bytes on 32/64-bit, but struct is packed to 4)
    //   BOOL  fTransitionOnMaximized (4 bytes) – FALSE (0)
    // We pass raw bytes — a 16-byte buffer covers all fields on both 32/64.
    const buf = Buffer.alloc(16, 0);
    buf.writeUInt32LE(DWM_BB_ENABLE, 0); // dwFlags = DWM_BB_ENABLE
    buf.writeUInt32LE(1, 4); // fEnable = TRUE
    const hr = dwmEnableBlurBehindWindow(hwnd, buf);
    if (hr !== 0) {
        console.warn(`[DWM] DwmEnableBlurBehindWindow returned HRESULT 0x${(hr >>> 0).toString(16)}`);
    }
}
function materialToBackdropType(material) {
    switch (material) {
        case "acrylic":
            return DWMSBT_TRANSIENTWINDOW;
        case "mica":
        default:
            return DWMSBT_MAINWINDOW;
    }
}
// ── Public API ──────────────────────────────────────────────────────────
/**
 * Re-apply DWM rounded corners and backdrop material on the given window.
 * Call this after any window-state change that may reset Win32 style flags.
 *
 * Strategy:
 *   1. Re-enable blur-behind (required for acrylic composition)
 *   2. Toggle backdrop to NONE first, then set desired type (forces DWM recomposition)
 *   3. Re-apply rounded corners
 */
function restoreDwmAttributes(win, material = "mica") {
    if (process.platform !== "win32")
        return;
    if (!ensureFFI())
        return;
    const hwnd = readHwnd(win.getNativeWindowHandle());
    // 1. Re-enable blur-behind composition
    enableBlurBehind(hwnd);
    // 2. Toggle backdrop: set NONE first, then desired type (forces DWM to re-compose)
    setDwmUint32(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, DWMSBT_NONE);
    setDwmUint32(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, materialToBackdropType(material));
    // 3. Restore rounded corners
    setDwmUint32(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND);
    console.log(`[DWM] Restored blur-behind + corner=ROUND + backdrop=${material}`);
}
/**
 * Remove the DWM backdrop (set to "none").
 */
function clearDwmBackdrop(win) {
    if (process.platform !== "win32")
        return;
    if (!ensureFFI())
        return;
    const hwnd = readHwnd(win.getNativeWindowHandle());
    setDwmUint32(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, DWMSBT_NONE);
    console.log("[DWM] Cleared backdrop material");
}
