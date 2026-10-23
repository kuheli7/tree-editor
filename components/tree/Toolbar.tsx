"use client";

import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Focus,
  Grid3x3,
  LayoutPanelTop,
  Map as MapIcon,
  Maximize,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTreeActions } from "@/hooks/useTreeActions";
import { cn } from "@/lib/cn";
import { nodeMatches } from "@/lib/tree/search";
import { useTreeStore } from "@/lib/tree/store";
import type { NodeKind } from "@/types/tree";

export const SEARCH_INPUT_ID = "tree-search";

type ToolButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  showLabel?: boolean;
};

function ToolButton({ icon: Icon, label, onClick, active, showLabel }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition active:scale-95",
        active ? "bg-accent/15 text-accent" : "text-ink hover:bg-surface-2",
      )}
    >
      <Icon className="size-4" />
      {showLabel && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}

const Divider = () => <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden />;

export function Toolbar() {
  const search = useTreeStore((s) => s.search);
  const setSearch = useTreeStore((s) => s.setSearch);
  const nodes = useTreeStore((s) => s.nodes);
  const direction = useTreeStore((s) => s.direction);
  const setDirection = useTreeStore((s) => s.setDirection);
  const showGrid = useTreeStore((s) => s.showGrid);
  const showMiniMap = useTreeStore((s) => s.showMiniMap);
  const toggleGrid = useTreeStore((s) => s.toggleGrid);
  const toggleMiniMap = useTreeStore((s) => s.toggleMiniMap);
  const { fitAll, focusNode, focusNodes, autoLayout } = useTreeActions();

  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(
    () => (search.trim() ? nodes.filter((n) => nodeMatches(n.type as NodeKind, n.data, search)) : []),
    [nodes, search],
  );

  const jump = (step: number) => {
    if (!matches.length) return;
    const next = (cursor + step + matches.length) % matches.length;
    setCursor(next);
    focusNode(matches[next].id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      jump(e.shiftKey ? -1 : 1);
    } else if (e.key === "Escape") {
      setSearch("");
      inputRef.current?.blur();
    }
  };

  const changeDirection = () => {
    // Flipping orientation only makes sense with a fresh layout, so re-run it.
    setDirection(direction === "TB" ? "LR" : "TB");
    autoLayout();
  };

  return (
    <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-line bg-surface/95 p-1 shadow-card backdrop-blur">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2.5 size-4 text-muted" />
        <input
          ref={inputRef}
          id={SEARCH_INPUT_ID}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCursor(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search nodes…  ( / )"
          aria-label="Search nodes"
          className="h-9 w-44 rounded-lg bg-surface-2 pl-8 pr-[4.6rem] text-sm text-ink outline-none transition placeholder:text-muted focus:ring-2 focus:ring-accent/50 sm:w-60"
        />
        {search && (
          <span className="absolute right-1 flex items-center gap-0.5">
            <span className={cn("px-1 text-[11px] tabular-nums", matches.length ? "text-muted" : "text-danger")}>
              {!matches.length ? "0" : cursor < 0 ? `${matches.length}` : `${cursor + 1}/${matches.length}`}
            </span>
            <button
              type="button"
              aria-label="Previous match"
              onClick={() => jump(-1)}
              disabled={!matches.length}
              className="grid size-5 place-items-center rounded text-muted hover:bg-surface hover:text-ink disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next match"
              onClick={() => jump(1)}
              disabled={!matches.length}
              className="grid size-5 place-items-center rounded text-muted hover:bg-surface hover:text-ink disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="grid size-5 place-items-center rounded text-muted hover:bg-surface hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>

      {search && matches.length > 1 && (
        <ToolButton icon={Focus} label="Fit all matches" onClick={() => focusNodes(matches.map((m) => m.id))} />
      )}

      <Divider />
      <ToolButton icon={LayoutPanelTop} label="Auto-layout" showLabel onClick={autoLayout} />
      <ToolButton
        icon={direction === "TB" ? ArrowDown : ArrowRight}
        label={direction === "TB" ? "Top → bottom" : "Left → right"}
        onClick={changeDirection}
      />
      <Divider />
      <ToolButton icon={Grid3x3} label="Toggle grid" active={showGrid} onClick={toggleGrid} />
      <ToolButton icon={MapIcon} label="Toggle mini-map" active={showMiniMap} onClick={toggleMiniMap} />
      <ToolButton icon={Maximize} label="Reset view" showLabel onClick={fitAll} />
    </div>
  );
}
