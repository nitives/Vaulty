import React from "react";

// Helper to render inline markdown (inline code, masked links, raw urls)
function renderInline(text: string) {
  // Regex to match:
  // 1. `inline code`
  // 2. [Link Text](http://url.com)
  // 3. http://bare-url.com
  // 4. **bold** or __bold__
  // 5. *italic* or _italic_
  // 6. ~~strikethrough~~
  const tokenRegex =
    /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s]+)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\n]+\*|_[^_\n]+_)|(~~[^~]+~~)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Masked Link
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-600)] hover:underline dark:text-[var(--accent-400)] !text-[var(--accent-600)] dark:!text-[var(--accent-400)] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Bare URL
    if (part.match(/^https?:\/\//)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-600)] hover:underline dark:text-[var(--accent-400)] !text-[var(--accent-600)] dark:!text-[var(--accent-400)] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    // Bold
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return (
        <strong key={index} className="font-semibold text-black dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return (
        <s key={index} className="opacity-85">
          {part.slice(2, -2)}
        </s>
      );
    }

    // Plain Text
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Parses a subset of Markdown inspired by Discord.
 * Supports:
 * - Headers (#, ##, ###)
 * - Subtext (-# )
 * - Masked Links ([text](url))
 * - Unordered Lists (- or *)
 * - Ordered Lists (1.)
 * - Code Blocks (inline `code` and multiline ```)
 * - Block Quotes (> and >>>)
 */
export function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  let inMultiQuote = false;
  let multiQuoteContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Multi-line block quote consumes all remaining lines
    if (inMultiQuote) {
      multiQuoteContent.push(line);
      continue;
    }

    // Inside a multi-line code block
    if (inCodeBlock) {
      if (line.trim() === "```") {
        inCodeBlock = false;
        elements.push(
          <pre
            key={i}
            className="bg-black/5 dark:bg-white/5 p-2 rounded-md font-mono text-sm overflow-x-auto my-1 border border-black/5 dark:border-white/5"
          >
            <code>{codeBlockContent.join("\n")}</code>
          </pre>,
        );
      } else {
        codeBlockContent.push(line);
      }
      continue;
    }

    // Start of a multi-line code block
    if (line.trim().startsWith("```")) {
      inCodeBlock = true;
      codeBlockContent = [];
      const firstLineCode = line.trim().slice(3);
      if (firstLineCode) {
        codeBlockContent.push(firstLineCode);
      }
      continue;
    }

    // Multi-line block quote (>>>)
    if (line.startsWith(">>> ")) {
      inMultiQuote = true;
      multiQuoteContent.push(line.slice(4));
      continue;
    }

    // Single-line block quote (>)
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-4 border-[var(--accent-300)] dark:border-[var(--accent-700)] pl-3 py-0.5 my-1 text-black/70 dark:text-white/70 bg-[var(--accent-50)] dark:bg-[var(--accent-950)] rounded-r px-2"
        >
          {renderInline(line.slice(2))}
        </blockquote>,
      );
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold mt-3 mb-1 text-black dark:text-white">
          {renderInline(line.slice(2))}
        </h1>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-xl font-bold mt-2 mb-1 text-black dark:text-white">
          {renderInline(line.slice(3))}
        </h2>,
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-lg font-bold mt-1 mb-0.5 text-black dark:text-white">
          {renderInline(line.slice(4))}
        </h3>,
      );
      continue;
    }

    // Subtext
    if (line.startsWith("-# ")) {
      elements.push(
        <p key={i} className="text-xs text-black/50 dark:text-white/50 my-0.5">
          {renderInline(line.slice(3))}
        </p>,
      );
      continue;
    }

    // Unordered lists (- or *)
    const ulMatch = line.match(/^(\s*)([-*])\s+(.*)/);
    if (ulMatch) {
      const indent = ulMatch[1].length;
      elements.push(
        <div
          key={i}
          className="flex my-0.5"
          style={{ paddingLeft: `${indent * 12}px` }}
        >
          <span className="mr-2 text-black/50 dark:text-white/50 select-none">•</span>
          <div>{renderInline(ulMatch[3])}</div>
        </div>,
      );
      continue;
    }

    // Ordered lists (1., 2., etc)
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
    if (olMatch) {
      const indent = olMatch[1].length;
      elements.push(
        <div
          key={i}
          className="flex my-0.5"
          style={{ paddingLeft: `${indent * 12}px` }}
        >
          <span className="mr-2 text-black/50 dark:text-white/50 select-none min-w-[1.2em] text-right">
            {olMatch[2]}.
          </span>
          <div>{renderInline(olMatch[3])}</div>
        </div>,
      );
      continue;
    }

    // Regular text (empty lines become br)
    elements.push(
      <p key={i} className="min-h-[1.5em]">
        {line.trim() === "" ? <br /> : renderInline(line)}
      </p>,
    );
  }

  // Handle unclosed blocks
  if (inCodeBlock) {
    elements.push(
      <pre
        key="unclosed-code"
        className="bg-black/5 dark:bg-white/5 p-2 rounded-md font-mono text-sm overflow-x-auto my-1 border border-black/5 dark:border-white/5"
      >
        <code>{codeBlockContent.join("\n")}</code>
      </pre>,
    );
  }

  if (inMultiQuote) {
    elements.push(
      <blockquote
        key="multiquote"
        className="border-l-4 border-[var(--accent-300)] dark:border-[var(--accent-700)] pl-3 py-0.5 my-1 text-black/70 dark:text-white/70 bg-[var(--accent-50)] dark:bg-[var(--accent-950)] rounded-r px-2"
      >
        {multiQuoteContent.map((l, j) => (
          <div key={j} className="min-h-[1.5em]">
            {l.trim() === "" ? <br /> : renderInline(l)}
          </div>
        ))}
      </blockquote>,
    );
  }

  return <div className="markdown-content space-y-0.5">{elements}</div>;
}
