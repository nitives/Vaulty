import fs from "fs";
import yaml from "yaml";
import * as cheerio from "cheerio";

export interface PulseAnchorDefinition {
  url: string;
  select: string;
  attribute: string;
}

export interface PulseExtractFieldDefinition {
  select: string;
  attribute: string;
  required?: boolean;
}

export interface PulseExtractDefinition {
  select?: string;
  attribute?: string;
  prefix?: string;
  suffix?: string;
  required?: boolean;
  all?: boolean;
  joinWith?: string;
  template?: string;
  fields?: Record<string, PulseExtractFieldDefinition>;
}

export interface PulseFlowStep {
  step: number;
  action: "fetch";
  url: string;
  extract: Record<string, PulseExtractDefinition>;
}

export interface PulseDefinition {
  name: string;
  id: string;
  heartbeat: string;
  anchor: PulseAnchorDefinition;
  flow: PulseFlowStep[];
}

export interface PulseFlowResult {
  variables: Record<string, string>;
  visitedUrls: string[];
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function normalizeUrl(rawUrl: string): string {
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

function parseAttribute(
  node: cheerio.Cheerio<any>,
  attribute: string,
): string | null {
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

function queryFirstInScope(
  scope: cheerio.Cheerio<any>,
  selector: string,
): cheerio.Cheerio<any> {
  const selfMatch = scope.filter(selector).first();
  if (selfMatch.length > 0) {
    return selfMatch;
  }

  return scope.find(selector).first();
}

function resolveTemplate(
  template: string,
  variables: Record<string, string>,
  strict: boolean,
): string {
  const missingKeys = new Set<string>();

  const resolved = template.replace(VARIABLE_PATTERN, (_match, rawKey: string) => {
    const key = rawKey.trim();
    const value = variables[key];
    if (value === undefined) {
      missingKeys.add(key);
      return "";
    }
    return value;
  });

  if (strict && missingKeys.size > 0) {
    throw new Error(
      `Missing variables: ${Array.from(missingKeys.values()).join(", ")}`,
    );
  }

  return resolved;
}

function requireString(
  source: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid pulse ${context}: "${key}" must be a non-empty string`);
  }
  return value.trim();
}

function requireRecord(
  source: Record<string, unknown>,
  key: string,
  context: string,
): Record<string, unknown> {
  const value = source[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid pulse ${context}: "${key}" must be an object`);
  }
  return value as Record<string, unknown>;
}

function toHeartbeat(value: unknown): string {
  if (typeof value !== "string") {
    return "1h";
  }

  const heartbeat = value.trim().toLowerCase().replace(/\s+/g, "");
  if (/^\d+[mhd]$/.test(heartbeat)) {
    return heartbeat;
  }

  return "1h";
}

function parsePulseDefinition(raw: unknown): PulseDefinition {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid pulse file: root must be an object");
  }

  const root = raw as Record<string, unknown>;
  const id = requireString(root, "id", "definition");
  const name = requireString(root, "name", "definition");

  const anchorRaw = requireRecord(root, "anchor", "definition");
  const anchor: PulseAnchorDefinition = {
    url: normalizeUrl(requireString(anchorRaw, "url", "anchor")),
    select: requireString(anchorRaw, "select", "anchor"),
    attribute:
      typeof anchorRaw.attribute === "string" && anchorRaw.attribute.trim()
        ? anchorRaw.attribute.trim()
        : "innerText",
  };

  const flowRaw = root.flow;
  if (!Array.isArray(flowRaw)) {
    throw new Error('Invalid pulse definition: "flow" must be an array');
  }

  const flow: PulseFlowStep[] = flowRaw.map((rawStep, index) => {
    if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) {
      throw new Error(`Invalid flow step at index ${index}`);
    }

    const stepObj = rawStep as Record<string, unknown>;
    const action = stepObj.action;
    if (action !== "fetch") {
      throw new Error(`Invalid flow step ${index + 1}: only "fetch" action is supported`);
    }

    const extractRaw = requireRecord(stepObj, "extract", `flow step ${index + 1}`);
    const extract: Record<string, PulseExtractDefinition> = {};

    for (const [key, rawExtract] of Object.entries(extractRaw)) {
      if (!rawExtract || typeof rawExtract !== "object" || Array.isArray(rawExtract)) {
        throw new Error(
          `Invalid extract config for "${key}" in flow step ${index + 1}`,
        );
      }

      const extractObj = rawExtract as Record<string, unknown>;
      const select =
        typeof extractObj.select === "string" && extractObj.select.trim()
          ? extractObj.select.trim()
          : undefined;

      const template =
        typeof extractObj.template === "string" && extractObj.template.length > 0
          ? extractObj.template
          : undefined;

      if (!select && !template) {
        throw new Error(
          `Invalid extract config for "${key}" in flow step ${index + 1}: expected "select" or "template"`,
        );
      }

      let fields: Record<string, PulseExtractFieldDefinition> | undefined;
      if (extractObj.fields !== undefined) {
        if (
          !extractObj.fields ||
          typeof extractObj.fields !== "object" ||
          Array.isArray(extractObj.fields)
        ) {
          throw new Error(
            `Invalid fields config for "${key}" in flow step ${index + 1}`,
          );
        }

        if (!select) {
          throw new Error(
            `Invalid extract config for "${key}" in flow step ${index + 1}: "fields" requires "select"`,
          );
        }

        fields = {};
        for (const [fieldName, rawField] of Object.entries(extractObj.fields)) {
          if (!rawField || typeof rawField !== "object" || Array.isArray(rawField)) {
            throw new Error(
              `Invalid field config "${fieldName}" for "${key}" in flow step ${index + 1}`,
            );
          }

          const fieldObj = rawField as Record<string, unknown>;
          fields[fieldName] = {
            select: requireString(
              fieldObj,
              "select",
              `extract "${key}" field "${fieldName}"`,
            ),
            attribute:
              typeof fieldObj.attribute === "string" && fieldObj.attribute.trim()
                ? fieldObj.attribute.trim()
                : "innerText",
            required:
              typeof fieldObj.required === "boolean" ? fieldObj.required : true,
          };
        }
      }

      extract[key] = {
        select,
        attribute:
          select &&
          typeof extractObj.attribute === "string" &&
          extractObj.attribute.trim()
            ? extractObj.attribute.trim()
            : select
              ? "innerText"
              : undefined,
        prefix:
          typeof extractObj.prefix === "string" ? extractObj.prefix : undefined,
        suffix:
          typeof extractObj.suffix === "string" ? extractObj.suffix : undefined,
        required:
          typeof extractObj.required === "boolean"
            ? extractObj.required
            : true,
        all: typeof extractObj.all === "boolean" ? extractObj.all : false,
        joinWith:
          typeof extractObj.joinWith === "string"
            ? extractObj.joinWith
            : undefined,
        template,
        fields,
      };
    }

    const stepNumber =
      typeof stepObj.step === "number" && Number.isFinite(stepObj.step)
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

function parsePulseFileContent(rawContent: string): PulseDefinition {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    throw new Error("Pulse file is empty");
  }

  let parsed: unknown;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    parsed = JSON.parse(trimmed);
  } else {
    parsed = yaml.parse(trimmed);
  }

  return parsePulseDefinition(parsed);
}

async function fetchHtml(url: string): Promise<string> {
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

export function loadPulseDefinition(filePath: string): PulseDefinition {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return parsePulseFileContent(fileContent);
}

export function applyPulseTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return resolveTemplate(template, variables, true);
}

export async function resolvePulseAnchor(
  definition: PulseDefinition,
  variables: Record<string, string> = {},
): Promise<string | null> {
  const anchorUrl = normalizeUrl(
    resolveTemplate(definition.anchor.url, variables, true),
  );
  const html = await fetchHtml(anchorUrl);
  const $ = cheerio.load(html);
  const node = $(definition.anchor.select).first();

  if (node.length === 0) {
    return null;
  }

  return parseAttribute(node, definition.anchor.attribute);
}

export async function executePulseFlow(
  definition: PulseDefinition,
  seedVariables: Record<string, string> = {},
): Promise<PulseFlowResult> {
  const variables: Record<string, string> = { ...seedVariables };
  const visitedUrls: string[] = [];

  const orderedSteps = [...definition.flow].sort((a, b) => a.step - b.step);

  for (const step of orderedSteps) {
    const resolvedUrl = normalizeUrl(resolveTemplate(step.url, variables, true));
    const html = await fetchHtml(resolvedUrl);
    visitedUrls.push(resolvedUrl);

    const $ = cheerio.load(html);
    const extractEntries = Object.entries(step.extract);
    const orderedExtractEntries: Array<[string, PulseExtractDefinition]> = [
      ...extractEntries.filter(([, config]) => Boolean(config.select)),
      ...extractEntries.filter(([, config]) => !config.select),
    ];

    for (const [variableName, extractConfig] of orderedExtractEntries) {
      const isRequired = extractConfig.required !== false;

      if (!extractConfig.select && extractConfig.template) {
        let templatedValue: string;
        try {
          templatedValue = resolveTemplate(
            extractConfig.template,
            variables,
            isRequired,
          );
        } catch (error) {
          if (isRequired) {
            throw error;
          }
          continue;
        }

        const prefix = extractConfig.prefix
          ? resolveTemplate(extractConfig.prefix, variables, false)
          : "";
        const suffix = extractConfig.suffix
          ? resolveTemplate(extractConfig.suffix, variables, false)
          : "";

        variables[variableName] = `${prefix}${templatedValue}${suffix}`;
        continue;
      }

      if (!extractConfig.select) {
        if (isRequired) {
          throw new Error(
            `Extract "${variableName}" in step ${step.step} is missing "select"`,
          );
        }
        continue;
      }

      const selectedNodes = extractConfig.all
        ? $(extractConfig.select)
            .toArray()
            .map((element) => $(element))
        : [$(extractConfig.select).first()];

      const renderedValues: string[] = [];
      const joinWith = extractConfig.joinWith ?? "\n";

      for (const node of selectedNodes) {
        if (node.length === 0) {
          continue;
        }

        const baseAttribute = extractConfig.attribute ?? "innerText";
        const baseValue = parseAttribute(node, baseAttribute);

        const elementVariables: Record<string, string> = { ...variables };
        elementVariables.index = String(renderedValues.length);
        elementVariables.n = String(renderedValues.length + 1);

        if (baseValue !== null) {
          elementVariables.value = baseValue;
          elementVariables.text = baseValue;
        }

        const nodeHtml = node.html()?.trim();
        if (nodeHtml) {
          elementVariables.html = nodeHtml;
        }

        const outerHtml = node.toString().trim();
        if (outerHtml) {
          elementVariables.outerHtml = outerHtml;
        }

        if (extractConfig.fields) {
          for (const [fieldName, fieldConfig] of Object.entries(
            extractConfig.fields,
          )) {
            const fieldNode = queryFirstInScope(node, fieldConfig.select);
            if (fieldNode.length === 0) {
              if (fieldConfig.required !== false && isRequired) {
                throw new Error(
                  `Field selector "${fieldConfig.select}" not found for "${variableName}.${fieldName}" in step ${step.step}`,
                );
              }
              continue;
            }

            const fieldValue = parseAttribute(fieldNode, fieldConfig.attribute);
            if (!fieldValue) {
              if (fieldConfig.required !== false && isRequired) {
                throw new Error(
                  `Field attribute "${fieldConfig.attribute}" missing for "${variableName}.${fieldName}" in step ${step.step}`,
                );
              }
              continue;
            }

            elementVariables[fieldName] = fieldValue;
          }
        }

        let outputValue: string | null = null;
        if (extractConfig.template) {
          try {
            outputValue = resolveTemplate(
              extractConfig.template,
              elementVariables,
              isRequired,
            );
          } catch (error) {
            if (isRequired) {
              throw error;
            }
            continue;
          }
        } else {
          outputValue = baseValue;
        }

        if (!outputValue || !outputValue.trim()) {
          continue;
        }

        renderedValues.push(outputValue.trim());

        if (!extractConfig.all) {
          break;
        }
      }

      if (renderedValues.length === 0) {
        if (isRequired) {
          throw new Error(
            `No extracted value for "${variableName}" in step ${step.step}`,
          );
        }
        continue;
      }

      const extractedValue = extractConfig.all
        ? renderedValues.join(joinWith)
        : renderedValues[0];

      const prefix = extractConfig.prefix
        ? resolveTemplate(extractConfig.prefix, variables, false)
        : "";
      const suffix = extractConfig.suffix
        ? resolveTemplate(extractConfig.suffix, variables, false)
        : "";

      variables[variableName] = `${prefix}${extractedValue}${suffix}`;
    }
  }

  return { variables, visitedUrls };
}
