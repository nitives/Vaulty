import type { AppSettings } from "@/lib/settings";

export {};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    electronAPI?: any;
    __VAULTY_SETTINGS__?: AppSettings | null;
  }
}
import type { AppSettings } from "@/lib/settings";

export {};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    electronAPI?: any;
    __VAULTY_SETTINGS__?: AppSettings | null;
  }
}
