export interface SearchQuery {
  cleanQuery: string;
  startDate?: Date;
  endDate?: Date;
  sizeFilter?: { operator: string; value: number };
}

export function parseSearchQuery(query: string): SearchQuery {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let sizeFilter: { operator: string; value: number } | undefined;
  let cleanQuery = query;

  // Extract explicit size: syntax
  // Supported formats: size:>1MB, size:>=1mb, size: > 1 mb, size:>1.5mb, size:>1,5mb, size:>1_000kb, size:>1m
  const sizeMatch = cleanQuery.match(/size\s*:\s*([>=<]{0,2})\s*([\d.,_]+)\s*(kb?|mb?|gb?|b)?/i);
  if (sizeMatch) {
    const operator = sizeMatch[1] || "<="; // Default to <= if no operator is provided
    
    // Parse the amount, replacing commas with dots for decimals, and removing underscores
    const amountStr = sizeMatch[2].replace(/_/g, "").replace(/,/g, ".");
    const amount = parseFloat(amountStr);
    
    const unit = (sizeMatch[3] || "b").toLowerCase();
    let bytes = amount;
    if (unit === "k" || unit === "kb") bytes *= 1024;
    else if (unit === "m" || unit === "mb") bytes *= 1024 * 1024;
    else if (unit === "g" || unit === "gb") bytes *= 1024 * 1024 * 1024;
    
    sizeFilter = { operator, value: bytes };
    cleanQuery = cleanQuery.replace(sizeMatch[0], "").trim();
  }

  // Extract explicit date:YYYY-MM-DD syntax
  const dateMatch = cleanQuery.match(/date:(\d{4}-\d{1,2}-\d{1,2})/i);
  if (dateMatch) {
    const parts = dateMatch[1].split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const day = parseInt(parts[2], 10);
    const start = new Date(year, month, day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month, day);
    end.setHours(23, 59, 59, 999);
    startDate = start;
    endDate = end;
    cleanQuery = cleanQuery.replace(dateMatch[0], "").trim();
  }

  // Match patterns like "from 3 weeks ago", "last week", "yesterday", etc.
  const patterns: Array<{
    regex: RegExp;
    handler: (match: RegExpMatchArray) => { start: Date; end: Date };
  }> = [
    {
      regex: /(?:from\s+)?(\d+)\s+days?\s+ago/i,
      handler: (match) => {
        const days = parseInt(match[1], 10);
        const start = new Date(now);
        start.setDate(start.getDate() - days);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
    },
    {
      regex: /(?:from\s+)?(\d+)\s+weeks?\s+ago/i,
      handler: (match) => {
        const weeks = parseInt(match[1], 10);
        const start = new Date(now);
        start.setDate(start.getDate() - weeks * 7 - 3);
        const end = new Date(now);
        end.setDate(end.getDate() - weeks * 7 + 3);
        return { start, end };
      },
    },
    {
      regex: /yesterday/i,
      handler: () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
    },
    {
      regex: /last\s+week/i,
      handler: () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { start, end: now };
      },
    },
    {
      regex: /last\s+month/i,
      handler: () => {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        return { start, end: now };
      },
    },
    {
      regex: /today/i,
      handler: () => {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      },
    },
  ];

  for (const { regex, handler } of patterns) {
    const match = query.match(regex);
    if (match) {
      const { start, end } = handler(match);
      startDate = start;
      endDate = end;
      // Using query.replace(regex) instead of cleanQuery.replace since we only ever want to replace the FIRST time query match, 
      // but if the user has multiple time filters, we just pick the first regex that matches the original `query` String... Wait! 
      cleanQuery = cleanQuery.replace(match[0], "").trim();
      break;
    }
  }

  return { cleanQuery, startDate, endDate, sizeFilter };
}
