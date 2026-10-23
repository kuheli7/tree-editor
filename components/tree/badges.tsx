import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { KIND_META, SEVERITY_META, STATUS_META } from "@/lib/tree/constants";
import type { NodeKind, NodeStatus, Severity } from "@/types/tree";

const tint = (color: string): CSSProperties => ({ ["--c" as string]: color });
const tinted = "bg-[color-mix(in_srgb,var(--c)_14%,transparent)] text-[var(--c)]";

export function KindBadge({ kind, className }: { kind: NodeKind; className?: string }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <span
      style={tint(meta.color)}
      className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", tinted, className)}
    >
      <Icon className="size-3" strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}

export function SeverityChip({ severity, className }: { severity: Severity; className?: string }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      style={tint(meta.color)}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", tinted, className)}
    >
      <span className="size-1.5 rounded-full bg-[var(--c)]" />
      {meta.label}
    </span>
  );
}

export function StatusDot({ status, withLabel = false }: { status: NodeStatus; withLabel?: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted" title={`Status: ${meta.label}`}>
      <span
        style={tint(meta.color)}
        className={cn(
          "size-2 rounded-full bg-[var(--c)]",
          status === "active" && "shadow-[0_0_0_3px_color-mix(in_srgb,var(--c)_22%,transparent)]",
          status === "draft" && "bg-transparent ring-2 ring-[var(--c)]",
        )}
      />
      {withLabel && meta.label}
    </span>
  );
}
