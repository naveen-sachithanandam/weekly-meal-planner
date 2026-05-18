"use client";

import { useCallback, useMemo, useState } from "react";

import {
  buildWhatsAppShareUrl,
  formatShoppingListShareText,
  shareShoppingList,
} from "../../lib/share-shopping-list";

type Props = {
  weekStart: string;
  items: string[];
};

export function ShoppingListShareActions({ weekStart, items }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const shareText = useMemo(
    () => formatShoppingListShareText(weekStart, items),
    [weekStart, items],
  );
  const whatsAppUrl = useMemo(() => buildWhatsAppShareUrl(shareText), [shareText]);

  const onShare = useCallback(async () => {
    setStatus(null);
    try {
      const result = await shareShoppingList(weekStart, items);
      if (result.method === "share") {
        setStatus("Shared.");
      } else if (result.method === "copy") {
        setStatus("Copied. Paste into WhatsApp or any chat.");
      } else {
        setStatus("Use Send via WhatsApp below.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setStatus("Could not share. Try Send via WhatsApp.");
    }
  }, [weekStart, items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="no-print mb-4 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      data-testid="shopping-list-share"
    >
      <button
        type="button"
        className="btn-accent btn-touch w-full px-3 py-2.5 text-sm sm:w-auto sm:py-2"
        onClick={onShare}
      >
        Share list
      </button>
      <a
        href={whatsAppUrl}
        className="btn-neutral btn-touch inline-flex w-full justify-center px-3 py-2.5 text-sm sm:w-auto sm:py-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        Send via WhatsApp
      </a>
      {status && (
        <p className="w-full text-xs text-muted" role="status" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
