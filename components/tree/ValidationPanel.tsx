"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, Link2Off, Repeat, ShieldCheck, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useTreeActions } from "@/hooks/useTreeActions";
import { cn } from "@/lib/cn";
import { useTreeStore } from "@/lib/tree/store";
import type { IssueType } from "@/types/tree";
import { Button } from "@/components/ui/Button";
import { useValidation } from "./ValidationContext";

const ICONS: Record<IssueType, LucideIcon> = {
  orphan: Link2Off,
  cycle: Repeat,
  "no-root": AlertOctagon,
  "multi-root": AlertOctagon,
  "multi-parent": AlertTriangle,
};

/** Runs the same check the panel shows, but as an explicit action that reports back with a toast. */
export function useRunValidation() {
  const result = useValidation();
  return () => {
    const errors = result.issues.filter((i) => i.level === "error").length;
    const warnings = result.issues.length - errors;
    if (!result.issues.length) toast.success("Tree is valid — no orphans or circular references.");
    else
      toast.error(
        `${errors} error${errors === 1 ? "" : "s"}${warnings ? `, ${warnings} warning${warnings === 1 ? "" : "s"}` : ""} found in the tree.`,
        { description: "Open the Validation panel to jump to each problem." },
      );
    return result;
  };
}

export function ValidationPanel() {
  const { issues, ok } = useValidation();
  const nodeCount = useTreeStore((s) => s.nodes.length);
  const { focusNodes } = useTreeActions();
  const run = useRunValidation();

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;

  return (
    <section aria-label="Tree validation" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Validation</h2>
        <Button size="sm" onClick={run}>
          <ShieldCheck className="size-3.5" /> Run check
        </Button>
      </div>

      <div
        role="status"
        className={cn(
          "flex items-center gap-2.5 rounded-xl border p-3 text-sm transition-colors",
          nodeCount === 0
            ? "border-line bg-surface-2 text-muted"
            : ok && !warnings
              ? "border-ok/40 bg-ok/10 text-ok"
              : ok
                ? "border-warn/40 bg-warn/10 text-warn"
                : "border-danger/40 bg-danger/10 text-danger",
        )}
      >
        {nodeCount === 0 ? (
          <>Canvas is empty — nothing to validate.</>
        ) : issues.length === 0 ? (
          <>
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="font-medium">Valid tree — no orphans or cycles.</span>
          </>
        ) : (
          <>
            <AlertTriangle className="size-4 shrink-0" />
            <span className="font-medium">
              {errors} error{errors === 1 ? "" : "s"}
              {warnings > 0 && `, ${warnings} warning${warnings === 1 ? "" : "s"}`}
            </span>
          </>
        )}
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1.5">
          {issues.map((issue) => {
            const Icon = ICONS[issue.type];
            const clickable = issue.nodeIds.length > 0;
            return (
              <li key={issue.id}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => focusNodes(issue.nodeIds)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border border-line bg-surface p-2.5 text-left text-xs transition",
                    clickable && "hover:border-danger/50 hover:bg-surface-2",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", issue.level === "error" ? "text-danger" : "text-warn")} />
                  <span className="min-w-0">
                    <span className="block font-semibold capitalize text-ink">{issue.type.replace("-", " ")}</span>
                    <span className="block leading-relaxed text-muted">{issue.message}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
