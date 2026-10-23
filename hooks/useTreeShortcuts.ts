"use client";

import { useEffect } from "react";
import { selectSelectedId, useTreeStore } from "@/lib/tree/store";
import { notify } from "./useTreeActions";
import { SEARCH_INPUT_ID } from "@/components/tree/Toolbar";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/** Editor-wide keyboard shortcuts. Ignored while the user is typing in a field. */
export function useTreeShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const state = useTreeStore.getState();

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        state.redo();
      } else if (mod && key === "d") {
        e.preventDefault();
        const id = selectSelectedId(state);
        if (id) notify(state.duplicateNode(id));
      } else if (key === "/" || (mod && key === "k")) {
        e.preventDefault();
        document.getElementById(SEARCH_INPUT_ID)?.focus();
      } else if (key === "escape") {
        state.selectOnly(null);
        if (state.search) state.setSearch("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
