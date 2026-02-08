/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Format a date as a short time string (e.g., "2:29 PM" for today, "Feb 7, 2:29 PM" for older)
 */
export function formatTimeShort(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return timeStr;
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  // For older dates, show the date
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Generate a simple unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse natural time references from a search query
 * Returns the original query with time parts removed, plus a date range
 */
export function parseTimeQuery(query: string): {
  cleanQuery: string;
  startDate?: Date;
  endDate?: Date;
} {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let cleanQuery = query;

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
        start.setDate(start.getDate() - days - 1);
        const end = new Date(now);
        end.setDate(end.getDate() - days + 1);
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
      cleanQuery = query.replace(regex, "").trim();
      break;
    }
  }

  return { cleanQuery, startDate, endDate };
}
