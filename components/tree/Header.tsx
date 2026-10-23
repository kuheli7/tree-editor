"use client";

import {
  ArrowLeft,
  FileJson,
  MoreHorizontal,
  PanelLeft,
  RotateCcw,
  Redo2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Undo2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTreeActions } from "@/hooks/useTreeActions";
import { cn } from "@/lib/cn";
import { useTreeStore } from "@/lib/tree/store";
import { useValidation } from "./ValidationContext";
import { useRunValidation } from "./ValidationPanel";

type Props = {
  onToggleSidebar: () => void;
  onOpenJson: (tab: "export" | "import") => void;
  onValidate: () => void;
};

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink transition hover:bg-surface-2 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Header({ onToggleSidebar, onOpenJson, onValidate }: Props) {
  const name = useTreeStore((s) => s.name);
  const setName = useTreeStore((s) => s.setName);
  const canUndo = useTreeStore((s) => s.past.length > 0);
  const canRedo = useTreeStore((s) => s.future.length > 0);
  const undo = useTreeStore((s) => s.undo);
  const redo = useTreeStore((s) => s.redo);
  const resetToSample = useTreeStore((s) => s.resetToSample);
  const clearTree = useTreeStore((s) => s.clearTree);
  const { issues, ok } = useValidation();
  const run = useRunValidation();
  const { fitAll } = useTreeActions();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<"reset" | "clear" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const errorCount = issues.filter((i) => i.level === "error").length;
  const hasIssues = issues.length > 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle palette and validation panel"
        className="grid size-9 place-items-center rounded-lg border border-line text-ink transition hover:bg-surface-2 lg:hidden"
      >
        <PanelLeft className="size-4" />
      </button>

      <Link
        href="/"
        title="Back to modules"
        className="hidden size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink sm:grid"
      >
        <ArrowLeft className="size-4" />
      </Link>

      <div className="flex min-w-0 items-center gap-2.5">
        <span className="hidden size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink sm:grid">
          <Workflow className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="hidden text-[10px] font-semibold uppercase tracking-wider text-muted sm:block">Policy tree editor</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Tree name"
            className="-ml-1 w-full max-w-[44vw] truncate rounded-md bg-transparent px-1 text-sm font-semibold text-ink outline-none transition hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-accent/40 sm:max-w-64"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 className="size-4" />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
          <Redo2 className="size-4" />
        </IconButton>

        <button
          type="button"
          onClick={() => {
            run();
            onValidate();
          }}
          title="Validate tree"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition active:scale-95",
            !hasIssues
              ? "border-ok/40 bg-ok/10 text-ok hover:bg-ok/15"
              : ok
                ? "border-warn/40 bg-warn/10 text-warn hover:bg-warn/15"
                : "border-danger/40 bg-danger/10 text-danger hover:bg-danger/15",
          )}
        >
          {hasIssues ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
          <span className="hidden sm:inline">{hasIssues ? `${errorCount || issues.length} issue${(errorCount || issues.length) === 1 ? "" : "s"}` : "Valid"}</span>
          {hasIssues && <span className="sm:hidden">{errorCount || issues.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => onOpenJson("export")}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink transition hover:brightness-110 active:scale-95"
        >
          <FileJson className="size-4" />
          <span className="hidden sm:inline">JSON</span>
        </button>

        <ThemeToggle />

        <div ref={menuRef} className="relative">
          <IconButton label="More actions" onClick={() => setMenuOpen((v) => !v)}>
            <MoreHorizontal className="size-4" />
          </IconButton>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop [animation:pop-in_160ms_var(--ease-out-expo)]"
            >
              {[
                { label: "Import JSON…", icon: FileJson, run: () => onOpenJson("import") },
                { label: "Reset view", icon: RotateCcw, run: fitAll },
                { label: "Restore sample tree", icon: Workflow, run: () => setConfirm("reset") },
                { label: "Clear canvas", icon: Trash2, run: () => setConfirm("clear"), danger: true },
              ].map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    item.run();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-2",
                    item.danger ? "text-danger" : "text-ink",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "reset"}
        title="Restore the sample tree?"
        description="This replaces the current canvas with the default Firm Compliance Policy. You can undo it afterwards."
        confirmLabel="Restore sample"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          resetToSample();
          setTimeout(fitAll, 80);
          toast.success("Sample tree restored. Undo is available.");
        }}
      />
      <ConfirmDialog
        open={confirm === "clear"}
        title="Clear the canvas?"
        description="Every node and link will be removed. You can undo it afterwards."
        confirmLabel="Clear canvas"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          clearTree();
          toast.success("Canvas cleared. Undo is available.");
        }}
      />
    </header>
  );
}
