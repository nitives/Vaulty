"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPulseDefinition = loadPulseDefinition;
exports.applyPulseTemplate = applyPulseTemplate;
exports.resolvePulseAnchor = resolvePulseAnchor;
exports.executePulseFlow = executePulseFlow;
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
const cheerio = __importStar(require("cheerio"));
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
function normalizeUrl(rawUrl) {
    const trimmed = rawUrl.trim();
    const markdownLinkMatch = trimmed.match(/^\[[^\]]+\]\((https?:\/\/[^)]+)\)$/i);
    if (markdownLinkMatch) {
        return markdownLinkMatch[1];
    }
    const wrappedUrlMatch = trimmed.match(/^\[(https?:\/\/[^\]]+)\]$/i);
    if (wrappedUrlMatch) {
        return wrappedUrlMatch[1];
    }
    return trimmed;
}
function parseAttribute(node, attribute) {
    const attr = attribute.trim();
    const lower = attr.toLowerCase();
    if (lower === "innertext" || lower === "text") {
        const value = node.text().trim();
        return value || null;
    }
    if (lower === "innerhtml" || lower === "html") {
        const value = node.html()?.trim();
        return value || null;
    }
    if (lower === "outerhtml") {
        const value = node.toString().trim();
        return value || null;
    }
    const value = node.attr(attr)?.trim();
    return value || null;
}
function resolveTemplate(template, variables, strict) {
    const missingKeys = new Set();
    const resolved = template.replace(VARIABLE_PATTERN, (_match, rawKey) => {
        const key = rawKey.trim();
        const value = variables[key];
        if (value === undefined) {
            missingKeys.add(key);
            return "";
        }
        return value;
    });
    if (strict && missingKeys.size > 0) {
        throw new Error(`Missing variables: ${Array.from(missingKeys.values()).join(", ")}`);
    }
    return resolved;
}
function requireString(source, key, context) {
    const value = source[key];
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Invalid pulse ${context}: "${key}" must be a non-empty string`);
    }
    return value.trim();
}
function requireRecord(source, key, context) {
    const value = source[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Invalid pulse ${context}: "${key}" must be an object`);
    }
    return value;
}
function toHeartbeat(value) {
    if (typeof value !== "string") {
        return "1h";
    }
    const heartbeat = value.trim().toLowerCase().replace(/\s+/g, "");
    if (/^\d+[mhd]$/.test(heartbeat)) {
        return heartbeat;
    }
    return "1h";
}
function parsePulseDefinition(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("Invalid pulse file: root must be an object");
    }
    const root = raw;
    const id = requireString(root, "id", "definition");
    const name = requireString(root, "name", "definition");
    const anchorRaw = requireRecord(root, "anchor", "definition");
    const anchor = {
        url: normalizeUrl(requireString(anchorRaw, "url", "anchor")),
        select: requireString(anchorRaw, "select", "anchor"),
        attribute: typeof anchorRaw.attribute === "string" && anchorRaw.attribute.trim()
            ? anchorRaw.attribute.trim()
            : "innerText",
    };
    const flowRaw = root.flow;
    if (!Array.isArray(flowRaw)) {
        throw new Error('Invalid pulse definition: "flow" must be an array');
    }
    const flow = flowRaw.map((rawStep, index) => {
        if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) {
            throw new Error(`Invalid flow step at index ${index}`);
        }
        const stepObj = rawStep;
        const action = stepObj.action;
        if (action !== "fetch") {
            throw new Error(`Invalid flow step ${index + 1}: only "fetch" action is supported`);
        }
        const extractRaw = requireRecord(stepObj, "extract", `flow step ${index + 1}`);
        const extract = {};
        for (const [key, rawExtract] of Object.entries(extractRaw)) {
            if (!rawExtract || typeof rawExtract !== "object" || Array.isArray(rawExtract)) {
                throw new Error(`Invalid extract config for "${key}" in flow step ${index + 1}`);
            }
            const extractObj = rawExtract;
            extract[key] = {
                select: requireString(extractObj, "select", `extract "${key}"`),
                attribute: typeof extractObj.attribute === "string" && extractObj.attribute.trim()
                    ? extractObj.attribute.trim()
                    : "innerText",
                prefix: typeof extractObj.prefix === "string" ? extractObj.prefix : undefined,
                suffix: typeof extractObj.suffix === "string" ? extractObj.suffix : undefined,
                required: typeof extractObj.required === "boolean"
                    ? extractObj.required
                    : true,
            };
        }
        const stepNumber = typeof stepObj.step === "number" && Number.isFinite(stepObj.step)
            ? stepObj.step
            : index + 1;
        return {
            step: stepNumber,
            action: "fetch",
            url: normalizeUrl(requireString(stepObj, "url", `flow step ${index + 1}`)),
            extract,
        };
    });
    return {
        id,
        name,
        heartbeat: toHeartbeat(root.heartbeat),
        anchor,
        flow,
    };
}
function parsePulseFileContent(rawContent) {
    const trimmed = rawContent.trim();
    if (!trimmed) {
        throw new Error("Pulse file is empty");
    }
    let parsed;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        parsed = JSON.parse(trimmed);
    }
    else {
        parsed = yaml_1.default.parse(trimmed);
    }
    return parsePulseDefinition(parsed);
}
async function fetchHtml(url) {
    const response = await fetch(url, {
        redirect: "follow",
        headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    });
    if (!response.ok) {
        throw new Error(`Request failed (${response.status}) for ${url}`);
    }
    return response.text();
}
function loadPulseDefinition(filePath) {
    const fileContent = fs_1.default.readFileSync(filePath, "utf-8");
    return parsePulseFileContent(fileContent);
}
function applyPulseTemplate(template, variables) {
    return resolveTemplate(template, variables, true);
}
async function resolvePulseAnchor(definition, variables = {}) {
    const anchorUrl = normalizeUrl(resolveTemplate(definition.anchor.url, variables, true));
    const html = await fetchHtml(anchorUrl);
    const $ = cheerio.load(html);
    const node = $(definition.anchor.select).first();
    if (node.length === 0) {
        return null;
    }
    return parseAttribute(node, definition.anchor.attribute);
}
async function executePulseFlow(definition, seedVariables = {}) {
    const variables = { ...seedVariables };
    const visitedUrls = [];
    const orderedSteps = [...definition.flow].sort((a, b) => a.step - b.step);
    for (const step of orderedSteps) {
        const resolvedUrl = normalizeUrl(resolveTemplate(step.url, variables, true));
        const html = await fetchHtml(resolvedUrl);
        visitedUrls.push(resolvedUrl);
        const $ = cheerio.load(html);
        for (const [variableName, extractConfig] of Object.entries(step.extract)) {
            const node = $(extractConfig.select).first();
            if (node.length === 0) {
                if (extractConfig.required !== false) {
                    throw new Error(`Selector "${extractConfig.select}" not found in step ${step.step}`);
                }
                continue;
            }
            const extracted = parseAttribute(node, extractConfig.attribute);
            if (!extracted) {
                if (extractConfig.required !== false) {
                    throw new Error(`Attribute "${extractConfig.attribute}" missing for "${variableName}" in step ${step.step}`);
                }
                continue;
            }
            const prefix = extractConfig.prefix
                ? resolveTemplate(extractConfig.prefix, variables, false)
                : "";
            const suffix = extractConfig.suffix
                ? resolveTemplate(extractConfig.suffix, variables, false)
                : "";
            variables[variableName] = `${prefix}${extracted}${suffix}`;
        }
    }
    return { variables, visitedUrls };
}
