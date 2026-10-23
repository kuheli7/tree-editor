"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { KIND_META } from "@/lib/tree/constants";
import { nodeMatches } from "@/lib/tree/search";
import { useTreeStore } from "@/lib/tree/store";
import type { IssueType, NodeKind, PolicyNode } from "@/types/tree";
import { KindBadge, SeverityChip, StatusDot } from "./badges";
import { useValidation } from "./ValidationContext";

const FLAG_LABEL: Record<IssueType, string> = {
  orphan: "Orphan",
  cycle: "Cycle",
  "no-root": "No root",
  "multi-root": "Extra root",
  "multi-parent": "Multi-parent",
};

function PolicyNodeView({ id, type, data, selected }: NodeProps<PolicyNode>) {
  const kind = type as NodeKind;
  const meta = KIND_META[kind];

  const direction = useTreeStore((s) => s.direction);
  const search = useTreeStore((s) => s.search);
  const flag = useValidation().flagged[id];

  const searching = search.trim().length > 0;
  const matched = searching && nodeMatches(kind, data, search);
  const dimmed = searching && !matched;
  const horizontal = direction === "LR";

  return (
    <div className="relative" style={{ ["--c" as string]: meta.color } as CSSProperties}>
      <div
        className={cn(
          "node-enter relative h-[108px] w-[252px] overflow-hidden rounded-xl border bg-surface shadow-card transition-[opacity,box-shadow,border-color,transform] duration-200",
          "border-line hover:-translate-y-px hover:shadow-pop",
          flag && "border-danger/70",
          selected && "border-accent ring-2 ring-accent/60",
          matched && "border-warn ring-2 ring-warn/70",
          dimmed && "opacity-25",
          data.status === "disabled" && !dimmed && "opacity-70",
        )}
      >
        {/* kind colour band */}
        <span className="absolute inset-y-0 left-0 w-1 bg-[var(--c)]" aria-hidden />

        <div className="flex h-full flex-col justify-between gap-1 py-2.5 pl-4 pr-3">
          <div className="flex items-center justify-between gap-2">
            <KindBadge kind={kind} />
            <span className="flex items-center gap-2">
              <span className="max-w-[92px] truncate font-mono text-[11px] text-muted" title={data.ruleId}>
                {data.ruleId || "—"}
              </span>
              <StatusDot status={data.status} />
            </span>
          </div>

          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink" title={data.label}>
            {data.label || <span className="text-muted">Untitled node</span>}
          </p>

          <div className="flex items-center justify-between gap-2">
            <SeverityChip severity={data.severity} />
            {data.tags.length > 0 && (
              <span className="truncate text-[11px] text-muted" title={data.tags.join(", ")}>
                #{data.tags[0]}
                {data.tags.length > 1 && ` +${data.tags.length - 1}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Handles live outside the clipped card so they can overhang its edge. */}
      {kind !== "root" && (
        <Handle type="target" position={horizontal ? Position.Left : Position.Top} className="policy-handle" />
      )}
      <Handle type="source" position={horizontal ? Position.Right : Position.Bottom} className="policy-handle" />

      {flag && (
        <span
          className="absolute -right-2 -top-2.5 z-10 inline-flex items-center gap-1 rounded-full border border-danger/50 bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger shadow-card"
          title="This node has a validation problem — see the Validation panel"
        >
          <AlertTriangle className="size-3" />
          {FLAG_LABEL[flag]}
        </span>
      )}
    </div>
  );
}

const View = memo(PolicyNodeView);

export const policyNodeTypes = {
  root: View,
  rule: View,
  condition: View,
  action: View,
};
