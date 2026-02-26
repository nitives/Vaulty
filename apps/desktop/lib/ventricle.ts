import type { FSWatcher } from "chokidar";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getPulsesConfigPath } from "./paths";
import {
  StoredPulse,
  StoredPulseItem,
  ensureDataDirectories,
  loadPulses,
  loadPulseItems,
  savePulses,
  savePulseItems,
} from "./storage";
import {
  PulseDefinition,
  executePulseFlow,
  loadPulseDefinition,
  resolvePulseAnchor,
} from "./pulse-scraper";

interface PulseDefinitionRegistryEntry {
  filePath: string;
  definition: PulseDefinition;
}

interface VentricleOptions {
  onNewPulseItem?: (item: StoredPulseItem) => void;
}

let watcher: FSWatcher | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let heartbeatTickInProgress = false;

const pulseDefinitions = new Map<string, PulseDefinitionRegistryEntry>();
const pulseIdsInFlight = new Set<string>();
let newPulseItemListener: ((item: StoredPulseItem) => void) | null = null;

const importDynamic = new Function(
  "modulePath",
  "return import(modulePath);",
) as (modulePath: string) => Promise<typeof import("chokidar")>;

async function loadChokidar() {
  return importDynamic("chokidar");
}

function isPulseFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".pulse");
}

function parseHeartbeat(heartbeat: string): number {
  const raw = heartbeat.trim().toLowerCase().replace(/\s+/g, "");
  const match = raw.match(/^(\d+)([mhd])$/);
  if (!match) {
    return 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 60 * 60 * 1000;
  }

  const unit = match[2];
  if (unit === "m") return amount * 60 * 1000;
  if (unit === "h") return amount * 60 * 60 * 1000;
  if (unit === "d") return amount * 24 * 60 * 60 * 1000;

  return 60 * 60 * 1000;
}

function firstNonEmpty(...values: Array<string | undefined | null>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function toIsoDateIfValid(value: string | undefined): string | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

function getPulseFiles(configPath: string): string[] {
  if (!fs.existsSync(configPath)) {
    return [];
  }

  return fs
    .readdirSync(configPath)
    .filter((entry) => entry.toLowerCase().endsWith(".pulse"))
    .map((entry) => path.join(configPath, entry));
}

function upsertPulseRecord(definition: PulseDefinition, filePath: string): void {
  const pulses = loadPulses();
  const existing = pulses.find((pulse) => pulse.id === definition.id);

  if (existing) {
    existing.name = definition.name;
    existing.heartbeat = definition.heartbeat;
    existing.enabled = true;
    existing.filePath = filePath;
  } else {
    const createdPulse: StoredPulse = {
      id: definition.id,
      name: definition.name,
      heartbeat: definition.heartbeat,
      lastChecked: null,
      lastAnchorValue: null,
      enabled: true,
      addedAt: new Date().toISOString(),
      filePath,
    };
    pulses.push(createdPulse);
  }

  savePulses(pulses);
}

function disableMissingPulses(activeIds: Set<string>): void {
  const pulses = loadPulses();
  let modified = false;

  for (const pulse of pulses) {
    if (!activeIds.has(pulse.id) && pulse.enabled) {
      pulse.enabled = false;
      modified = true;
    }
  }

  if (modified) {
    savePulses(pulses);
  }
}

function reloadPulseDefinitionsFromDisk(): void {
  const configPath = getPulsesConfigPath();
  const filePaths = getPulseFiles(configPath);
  const activeIds = new Set<string>();

  pulseDefinitions.clear();

  for (const filePath of filePaths) {
    try {
      const definition = loadPulseDefinition(filePath);
      pulseDefinitions.set(definition.id, { filePath, definition });
      activeIds.add(definition.id);
      upsertPulseRecord(definition, filePath);
    } catch (error) {
      console.error(`[Ventricle] Failed to load pulse file ${filePath}:`, error);
    }
  }

  disableMissingPulses(activeIds);
}

function registerOrUpdatePulseDefinition(filePath: string): void {
  if (!isPulseFile(filePath)) {
    return;
  }

  try {
    const definition = loadPulseDefinition(filePath);

    // If the same file changed pulse id, disable the old pulse id mapping.
    const staleIds: string[] = [];
    for (const [existingId, entry] of pulseDefinitions.entries()) {
      if (entry.filePath === filePath && existingId !== definition.id) {
        staleIds.push(existingId);
      }
    }

    if (staleIds.length > 0) {
      const pulses = loadPulses();
      let changed = false;

      for (const staleId of staleIds) {
        pulseDefinitions.delete(staleId);
        const stalePulse = pulses.find((pulse) => pulse.id === staleId);
        if (stalePulse && stalePulse.enabled) {
          stalePulse.enabled = false;
          changed = true;
        }
      }

      if (changed) {
        savePulses(pulses);
      }
    }

    pulseDefinitions.set(definition.id, { filePath, definition });
    upsertPulseRecord(definition, filePath);

    // Run an immediate check after the file lands/changes.
    void executePulse(definition.id);
  } catch (error) {
    console.error(`[Ventricle] Failed parsing pulse file ${filePath}:`, error);
  }
}

function unregisterPulseDefinition(filePath: string): void {
  if (!isPulseFile(filePath)) {
    return;
  }

  let removedPulseId: string | null = null;
  for (const [pulseId, entry] of pulseDefinitions.entries()) {
    if (entry.filePath === filePath) {
      removedPulseId = pulseId;
      pulseDefinitions.delete(pulseId);
      break;
    }
  }

  if (!removedPulseId) {
    return;
  }

  const pulses = loadPulses();
  const pulse = pulses.find((existingPulse) => existingPulse.id === removedPulseId);
  if (pulse && pulse.enabled) {
    pulse.enabled = false;
    savePulses(pulses);
  }
}

async function checkHeartbeats(): Promise<void> {
  if (heartbeatTickInProgress) {
    return;
  }

  heartbeatTickInProgress = true;
  try {
    const now = Date.now();
    const pulses = loadPulses();

    for (const pulse of pulses) {
      if (!pulse.enabled) {
        continue;
      }

      const heartbeatMs = parseHeartbeat(pulse.heartbeat);
      const lastCheckedMs = pulse.lastChecked
        ? Date.parse(pulse.lastChecked)
        : Number.NaN;
      const shouldRun =
        Number.isNaN(lastCheckedMs) || now - lastCheckedMs >= heartbeatMs;

      if (shouldRun) {
        await executePulse(pulse.id);
      }
    }
  } catch (error) {
    console.error("[Ventricle] Heartbeat tick failed:", error);
  } finally {
    heartbeatTickInProgress = false;
  }
}

async function executePulse(pulseId: string): Promise<void> {
  if (pulseIdsInFlight.has(pulseId)) {
    return;
  }

  pulseIdsInFlight.add(pulseId);
  try {
    const registryEntry = pulseDefinitions.get(pulseId);
    if (!registryEntry) {
      return;
    }

    const pulses = loadPulses();
    const pulse = pulses.find((candidate) => candidate.id === pulseId);
    if (!pulse || !pulse.enabled) {
      return;
    }

    pulse.lastChecked = new Date().toISOString();

    const anchorValue = await resolvePulseAnchor(registryEntry.definition);
    if (!anchorValue || anchorValue === pulse.lastAnchorValue) {
      savePulses(pulses);
      return;
    }

    const flowResult = await executePulseFlow(registryEntry.definition, {
      anchor: anchorValue,
      anchorValue,
    });

    const variables = flowResult.variables;
    const title = firstNonEmpty(variables.title, variables.headline, pulse.name);
    const content = firstNonEmpty(variables.content, variables.summary, anchorValue);
    const url = firstNonEmpty(
      variables.url,
      variables.latest_link,
      flowResult.visitedUrls[flowResult.visitedUrls.length - 1],
      registryEntry.definition.anchor.url,
    );

    const expiresAt = toIsoDateIfValid(
      firstNonEmpty(
        variables.expiresAt,
        variables.expires_at,
        variables.expiry,
        variables.expiration,
        variables.event_date,
      ),
    );

    const pulseItems = loadPulseItems();
    const duplicate = pulseItems.find(
      (item) => item.pulseId === pulseId && item.anchorValue === anchorValue,
    );

    if (!duplicate) {
      const newPulseItem: StoredPulseItem = {
        id: uuidv4(),
        pulseId,
        title: title ?? pulse.name,
        content: content ?? "",
        url,
        isSeen: false,
        createdAt: new Date().toISOString(),
        expiresAt,
        anchorValue,
      };

      pulseItems.unshift(newPulseItem);
      savePulseItems(pulseItems);

      if (newPulseItemListener) {
        newPulseItemListener(newPulseItem);
      }
    }

    pulse.lastAnchorValue = anchorValue;
    savePulses(pulses);
  } catch (error) {
    console.error(`[Ventricle] Failed executing pulse "${pulseId}":`, error);
  } finally {
    pulseIdsInFlight.delete(pulseId);
  }
}

export async function initVentricle(options?: VentricleOptions): Promise<void> {
  ensureDataDirectories();
  newPulseItemListener = options?.onNewPulseItem ?? null;

  const configPath = getPulsesConfigPath();
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
  }

  reloadPulseDefinitionsFromDisk();

  const chokidar = await loadChokidar();

  watcher = chokidar.watch(configPath, {
    persistent: true,
    ignoreInitial: false,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 250,
      pollInterval: 100,
    },
  });

  watcher
    .on("add", registerOrUpdatePulseDefinition)
    .on("change", registerOrUpdatePulseDefinition)
    .on("unlink", unregisterPulseDefinition);

  heartbeatInterval = setInterval(() => {
    void checkHeartbeats();
  }, 60 * 1000);
}

export function stopVentricle(): void {
  if (watcher) {
    void watcher.close();
    watcher = null;
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  pulseDefinitions.clear();
  pulseIdsInFlight.clear();
  newPulseItemListener = null;
}

