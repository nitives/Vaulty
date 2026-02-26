"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initVentricle = initVentricle;
exports.stopVentricle = stopVentricle;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const paths_1 = require("./paths");
const storage_1 = require("./storage");
const pulse_scraper_1 = require("./pulse-scraper");
let watcher = null;
let heartbeatInterval = null;
let heartbeatTickInProgress = false;
const pulseDefinitions = new Map();
const pulseIdsInFlight = new Set();
let newPulseItemListener = null;
const importDynamic = new Function("modulePath", "return import(modulePath);");
async function loadChokidar() {
    return importDynamic("chokidar");
}
function isPulseFile(filePath) {
    return filePath.toLowerCase().endsWith(".pulse");
}
function parseHeartbeat(heartbeat) {
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
    if (unit === "m")
        return amount * 60 * 1000;
    if (unit === "h")
        return amount * 60 * 60 * 1000;
    if (unit === "d")
        return amount * 24 * 60 * 60 * 1000;
    return 60 * 60 * 1000;
}
function firstNonEmpty(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }
    return undefined;
}
function toIsoDateIfValid(value) {
    if (!value || !value.trim()) {
        return undefined;
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return undefined;
    }
    return new Date(timestamp).toISOString();
}
function getPulseFiles(configPath) {
    if (!fs_1.default.existsSync(configPath)) {
        return [];
    }
    return fs_1.default
        .readdirSync(configPath)
        .filter((entry) => entry.toLowerCase().endsWith(".pulse"))
        .map((entry) => path_1.default.join(configPath, entry));
}
function upsertPulseRecord(definition, filePath) {
    const pulses = (0, storage_1.loadPulses)();
    const existing = pulses.find((pulse) => pulse.id === definition.id);
    if (existing) {
        existing.name = definition.name;
        existing.heartbeat = definition.heartbeat;
        existing.enabled = true;
        existing.filePath = filePath;
    }
    else {
        const createdPulse = {
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
    (0, storage_1.savePulses)(pulses);
}
function disableMissingPulses(activeIds) {
    const pulses = (0, storage_1.loadPulses)();
    let modified = false;
    for (const pulse of pulses) {
        if (!activeIds.has(pulse.id) && pulse.enabled) {
            pulse.enabled = false;
            modified = true;
        }
    }
    if (modified) {
        (0, storage_1.savePulses)(pulses);
    }
}
function reloadPulseDefinitionsFromDisk() {
    const configPath = (0, paths_1.getPulsesConfigPath)();
    const filePaths = getPulseFiles(configPath);
    const activeIds = new Set();
    pulseDefinitions.clear();
    for (const filePath of filePaths) {
        try {
            const definition = (0, pulse_scraper_1.loadPulseDefinition)(filePath);
            pulseDefinitions.set(definition.id, { filePath, definition });
            activeIds.add(definition.id);
            upsertPulseRecord(definition, filePath);
        }
        catch (error) {
            console.error(`[Ventricle] Failed to load pulse file ${filePath}:`, error);
        }
    }
    disableMissingPulses(activeIds);
}
function registerOrUpdatePulseDefinition(filePath) {
    if (!isPulseFile(filePath)) {
        return;
    }
    try {
        const definition = (0, pulse_scraper_1.loadPulseDefinition)(filePath);
        // If the same file changed pulse id, disable the old pulse id mapping.
        const staleIds = [];
        for (const [existingId, entry] of pulseDefinitions.entries()) {
            if (entry.filePath === filePath && existingId !== definition.id) {
                staleIds.push(existingId);
            }
        }
        if (staleIds.length > 0) {
            const pulses = (0, storage_1.loadPulses)();
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
                (0, storage_1.savePulses)(pulses);
            }
        }
        pulseDefinitions.set(definition.id, { filePath, definition });
        upsertPulseRecord(definition, filePath);
        // Run an immediate check after the file lands/changes.
        void executePulse(definition.id);
    }
    catch (error) {
        console.error(`[Ventricle] Failed parsing pulse file ${filePath}:`, error);
    }
}
function unregisterPulseDefinition(filePath) {
    if (!isPulseFile(filePath)) {
        return;
    }
    let removedPulseId = null;
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
    const pulses = (0, storage_1.loadPulses)();
    const pulse = pulses.find((existingPulse) => existingPulse.id === removedPulseId);
    if (pulse && pulse.enabled) {
        pulse.enabled = false;
        (0, storage_1.savePulses)(pulses);
    }
}
async function checkHeartbeats() {
    if (heartbeatTickInProgress) {
        return;
    }
    heartbeatTickInProgress = true;
    try {
        const now = Date.now();
        const pulses = (0, storage_1.loadPulses)();
        for (const pulse of pulses) {
            if (!pulse.enabled) {
                continue;
            }
            const heartbeatMs = parseHeartbeat(pulse.heartbeat);
            const lastCheckedMs = pulse.lastChecked
                ? Date.parse(pulse.lastChecked)
                : Number.NaN;
            const shouldRun = Number.isNaN(lastCheckedMs) || now - lastCheckedMs >= heartbeatMs;
            if (shouldRun) {
                await executePulse(pulse.id);
            }
        }
    }
    catch (error) {
        console.error("[Ventricle] Heartbeat tick failed:", error);
    }
    finally {
        heartbeatTickInProgress = false;
    }
}
async function executePulse(pulseId) {
    if (pulseIdsInFlight.has(pulseId)) {
        return;
    }
    pulseIdsInFlight.add(pulseId);
    try {
        const registryEntry = pulseDefinitions.get(pulseId);
        if (!registryEntry) {
            return;
        }
        const pulses = (0, storage_1.loadPulses)();
        const pulse = pulses.find((candidate) => candidate.id === pulseId);
        if (!pulse || !pulse.enabled) {
            return;
        }
        pulse.lastChecked = new Date().toISOString();
        const anchorValue = await (0, pulse_scraper_1.resolvePulseAnchor)(registryEntry.definition);
        if (!anchorValue || anchorValue === pulse.lastAnchorValue) {
            (0, storage_1.savePulses)(pulses);
            return;
        }
        const flowResult = await (0, pulse_scraper_1.executePulseFlow)(registryEntry.definition, {
            anchor: anchorValue,
            anchorValue,
        });
        const variables = flowResult.variables;
        const title = firstNonEmpty(variables.title, variables.headline, pulse.name);
        const content = firstNonEmpty(variables.content, variables.summary, anchorValue);
        const url = firstNonEmpty(variables.url, variables.latest_link, flowResult.visitedUrls[flowResult.visitedUrls.length - 1], registryEntry.definition.anchor.url);
        const expiresAt = toIsoDateIfValid(firstNonEmpty(variables.expiresAt, variables.expires_at, variables.expiry, variables.expiration, variables.event_date));
        const pulseItems = (0, storage_1.loadPulseItems)();
        const duplicate = pulseItems.find((item) => item.pulseId === pulseId && item.anchorValue === anchorValue);
        if (!duplicate) {
            const newPulseItem = {
                id: (0, uuid_1.v4)(),
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
            (0, storage_1.savePulseItems)(pulseItems);
            if (newPulseItemListener) {
                newPulseItemListener(newPulseItem);
            }
        }
        pulse.lastAnchorValue = anchorValue;
        (0, storage_1.savePulses)(pulses);
    }
    catch (error) {
        console.error(`[Ventricle] Failed executing pulse "${pulseId}":`, error);
    }
    finally {
        pulseIdsInFlight.delete(pulseId);
    }
}
async function initVentricle(options) {
    (0, storage_1.ensureDataDirectories)();
    newPulseItemListener = options?.onNewPulseItem ?? null;
    const configPath = (0, paths_1.getPulsesConfigPath)();
    if (!fs_1.default.existsSync(configPath)) {
        fs_1.default.mkdirSync(configPath, { recursive: true });
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
function stopVentricle() {
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
