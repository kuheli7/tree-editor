"use client";

import { GripVertical, MousePointerClick } from "lucide-react";
import type { CSSProperties, DragEvent } from "react";
import { NODE_TEMPLATES } from "@/data/treeTemplates";
import { useTreeActions } from "@/hooks/useTreeActions";
import { cn } from "@/lib/cn";
import { DND_MIME, type DragPayload } from "@/lib/tree/dnd";
import { KIND_META, KIND_ORDER } from "@/lib/tree/constants";
import type { NodeKind } from "@/types/tree";

type ItemProps = {
  kind: NodeKind;
  title: string;
  subtitle: string;
  templateId?: string;
  onActivate: () => void;
};

function PaletteItem({ kind, title, subtitle, templateId, onActivate }: ItemProps) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  const onDragStart = (e: DragEvent<HTMLButtonElement>) => {
    const payload: DragPayload = { kind, templateId };
    e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onActivate}
      style={{ ["--c" as string]: meta.color } as CSSProperties}
      className={cn(
        "group flex w-full cursor-grab items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left shadow-sm transition",
        "hover:-translate-y-px hover:border-[var(--c)] hover:shadow-card active:cursor-grabbing active:scale-[0.98]",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--c)_15%,transparent)] text-[var(--c)]">
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[11px] text-muted">{subtitle}</span>
      </span>
      <GripVertical className="size-4 shrink-0 text-muted/50 transition group-hover:text-muted" />
    </button>
  );
}

export function Palette() {
  const { addFromPalette } = useTreeActions();

  return (
    <section aria-label="Node palette" className="space-y-5">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Node types</h2>
        <div className="mt-2 space-y-2">
          {KIND_ORDER.map((kind) => (
            <PaletteItem
              key={kind}
              kind={kind}
              title={KIND_META[kind].label}
              subtitle={KIND_META[kind].hint}
              onActivate={() => addFromPalette(kind)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Templates</h2>
        <div className="mt-2 space-y-2">
          {NODE_TEMPLATES.map((t) => (
            <PaletteItem
              key={t.id}
              kind={t.kind}
              title={t.title}
              subtitle={t.subtitle}
              templateId={t.id}
              onActivate={() => addFromPalette(t.kind, t.data)}
            />
          ))}
        </div>
      </div>

      <p className="flex gap-2 rounded-lg bg-surface-2 p-2.5 text-[11px] leading-relaxed text-muted">
        <MousePointerClick className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Drag onto the canvas. Drop <b className="text-ink">on a node</b> to attach as its child. Or just click an item — it
          joins the selected node.
        </span>
      </p>
    </section>
  );
}
