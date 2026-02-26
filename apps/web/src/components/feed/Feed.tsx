"use client";

import clsx from "clsx";
import { formatTimeShort } from "@/lib/utils";
import { FeedItem } from "@/hooks/useFeed";

interface FeedProps {
  items: FeedItem[];
  isLoading?: boolean;
  onSeen: (id: string) => void;
}

const HTML_LIKE_PATTERN = /<\/?[a-z][\s\S]*>/i;

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  document
    .querySelectorAll("script,style,iframe,object,embed,meta,link")
    .forEach((node) => node.remove());

  document.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const attrName = attribute.name.toLowerCase();
      const attrValue = attribute.value;

      if (attrName.startsWith("on") || attrName === "style") {
        node.removeAttribute(attribute.name);
        continue;
      }

      if (
        (attrName === "href" || attrName === "src") &&
        /^\s*javascript:/i.test(attrValue)
      ) {
        node.removeAttribute(attribute.name);
      }
    }

    if (node.tagName.toLowerCase() === "a") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  return document.body.innerHTML;
}

function renderPulseContent(content: string) {
  if (HTML_LIKE_PATTERN.test(content)) {
    return (
      <div
        className="prose prose-neutral max-w-none text-sm dark:prose-invert"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    );
  }

  return (
    <p className="whitespace-pre-wrap break-words text-sm text-neutral-700 dark:text-neutral-300">
      {content}
    </p>
  );
}

function formatExpiry(expiresAt?: Date): string | null {
  if (!expiresAt) {
    return null;
  }

  return expiresAt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Feed({ items, isLoading = false, onSeen }: FeedProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((index) => (
          <div
            key={index}
            className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full max-w-sm mx-auto items-center justify-center py-16 text-center">
        <h1 className="font-bold text-black/90 dark:text-white/90">
          You have no unseen pulse updates
        </h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Check back here for updates from your vaults and the community
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const formattedExpiry = formatExpiry(item.expiresAt);

        return (
          <article
            key={item.id}
            className={clsx(
              "rounded-xl border p-4",
              "border-black/10 bg-white/75 dark:border-white/10 dark:bg-white/5",
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--accent-700)] dark:text-[var(--accent-300)]">
                {item.pulseName}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatTimeShort(item.createdAt)}
              </span>
            </div>

            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {item.title}
            </h3>

            <div className="mt-3">{renderPulseContent(item.content)}</div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                {formattedExpiry && <span>Expires: {formattedExpiry}</span>}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-700)] hover:underline dark:text-[var(--accent-300)]"
                  >
                    Open source
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSeen(item.id)}
                className={clsx(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  "border-black/15 text-neutral-800 hover:bg-black/5",
                  "dark:border-white/20 dark:text-neutral-200 dark:hover:bg-white/10",
                )}
              >
                Seen
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
