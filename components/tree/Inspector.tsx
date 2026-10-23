"use client";

import { CopyPlus, CornerDownRight, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { notify, useTreeActions } from "@/hooks/useTreeActions";
import { cn } from "@/lib/cn";
import { KIND_META, KIND_ORDER, SEVERITIES, SEVERITY_META, STATUSES, STATUS_META } from "@/lib/tree/constants";
import { descendantsOf } from "@/lib/tree/graph";
import { selectSelectedId, useTreeStore } from "@/lib/tree/store";
import type { NodeKind, NodeStatus, Severity } from "@/types/tree";
import { Button } from "@/components/ui/Button";
import { KindBadge } from "./badges";

const inputClass =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30";

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

type SegOption<T extends string> = { value: T; label: string; color?: string };

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            style={{ ["--c" as string]: o.color ?? "var(--accent)" } as CSSProperties}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs font-medium transition",
              active
                ? "bg-surface text-[var(--c)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--c)_45%,transparent)]"
                : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim().replace(/^#/, "");
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface-2 p-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs text-ink shadow-sm">
          #{t}
          <button
            type="button"
            aria-label={`Remove tag ${t}`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="text-muted hover:text-danger"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={tags.length ? "Add tag…" : "Type a tag, press Enter"}
        aria-label="Add tag"
        className="min-w-24 flex-1 bg-transparent px-1.5 py-1 text-sm text-ink outline-none placeholder:text-muted"
      />
    </div>
  );
}

export function Inspector() {
  const selectedId = useTreeStore(selectSelectedId);
  const node = useTreeStore((s) => (selectedId ? s.nodes.find((n) => n.id === selectedId) : undefined));
  const edges = useTreeStore((s) => s.edges);
  const allNodes = useTreeStore((s) => s.nodes);

  const update = useTreeStore((s) => s.updateNodeData);
  const changeKind = useTreeStore((s) => s.changeKind);
  const setParent = useTreeStore((s) => s.setParent);
  const addChild = useTreeStore((s) => s.addChild);
  const duplicateNode = useTreeStore((s) => s.duplicateNode);
  const deleteNode = useTreeStore((s) => s.deleteNode);
  const selectOnly = useTreeStore((s) => s.selectOnly);
  const { focusNodes } = useTreeActions();

  const parentId = useMemo(() => edges.find((e) => e.target === selectedId)?.source ?? "", [edges, selectedId]);
  const childCount = useMemo(() => edges.filter((e) => e.source === selectedId).length, [edges, selectedId]);
  const blocked = useMemo(
    () => (selectedId ? descendantsOf(selectedId, edges) : new Set<string>()),
    [edges, selectedId],
  );

  if (!node || !selectedId) return null;
  const kind = node.type as NodeKind;
  const { data } = node;

  const patchParam = (index: number, patch: Partial<{ key: string; value: string }>) =>
    update(selectedId, { parameters: data.parameters.map((p, i) => (i === index ? { ...p, ...patch } : p)) });

  return (
    <aside
      aria-label="Node properties"
      className="absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-line bg-surface shadow-pop [animation:slide-in-right_260ms_var(--ease-out-expo)] sm:w-[372px]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <KindBadge kind={kind} />
            <h2 className="text-sm font-semibold text-ink">Properties</h2>
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-muted">id: {selectedId}</p>
        </div>
        <button
          type="button"
          onClick={() => selectOnly(null)}
          aria-label="Close properties"
          className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="thin-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <Field label="Label" htmlFor="insp-label">
          <input
            id="insp-label"
            value={data.label}
            onChange={(e) => update(selectedId, { label: e.target.value })}
            placeholder="e.g. Communications with the Public"
            className={inputClass}
          />
        </Field>

        <Field label="Rule ID" htmlFor="insp-rule">
          <input
            id="insp-rule"
            value={data.ruleId}
            onChange={(e) => update(selectedId, { ruleId: e.target.value })}
            placeholder="e.g. FINRA-2210"
            className={cn(inputClass, "font-mono")}
          />
        </Field>

        <Field label="Description" htmlFor="insp-desc">
          <textarea
            id="insp-desc"
            rows={3}
            value={data.description}
            onChange={(e) => update(selectedId, { description: e.target.value })}
            placeholder="What does this node enforce?"
            className={cn(inputClass, "resize-y")}
          />
        </Field>

        <Field label="Node type">
          <Segmented<NodeKind>
            label="Node type"
            value={kind}
            options={KIND_ORDER.map((k) => ({ value: k, label: KIND_META[k].label, color: KIND_META[k].color }))}
            onChange={(k) => notify(changeKind(selectedId, k))}
          />
        </Field>

        <Field label="Severity">
          <Segmented<Severity>
            label="Severity"
            value={data.severity}
            options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label, color: SEVERITY_META[s].color }))}
            onChange={(severity) => update(selectedId, { severity })}
          />
        </Field>

        <Field label="Status">
          <Segmented<NodeStatus>
            label="Status"
            value={data.status}
            options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, color: STATUS_META[s].color }))}
            onChange={(status) => update(selectedId, { status })}
          />
        </Field>

        <Field
          label="Parent"
          htmlFor="insp-parent"
          hint={kind === "root" ? "A Root node sits at the top and has no parent." : "Choose a different parent to re-parent this node and its branch."}
        >
          <select
            id="insp-parent"
            disabled={kind === "root"}
            value={parentId}
            onChange={(e) => notify(setParent(selectedId, e.target.value || null))}
            className={cn(inputClass, "disabled:opacity-50")}
          >
            <option value="">— none (orphan) —</option>
            {allNodes
              .filter((c) => c.id !== selectedId && !blocked.has(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.data.label || c.id}
                  {c.data.ruleId ? ` · ${c.data.ruleId}` : ""}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Parameters">
          <div className="space-y-2">
            {data.parameters.length === 0 && <p className="text-xs text-muted">No parameters yet.</p>}
            {data.parameters.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  aria-label={`Parameter ${i + 1} name`}
                  value={p.key}
                  onChange={(e) => patchParam(i, { key: e.target.value })}
                  placeholder="key"
                  className={cn(inputClass, "w-[40%] font-mono text-xs")}
                />
                <input
                  aria-label={`Parameter ${i + 1} value`}
                  value={p.value}
                  onChange={(e) => patchParam(i, { value: e.target.value })}
                  placeholder="value"
                  className={cn(inputClass, "flex-1 text-xs")}
                />
                <button
                  type="button"
                  aria-label={`Remove parameter ${p.key || i + 1}`}
                  onClick={() => update(selectedId, { parameters: data.parameters.filter((_, j) => j !== i) })}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => update(selectedId, { parameters: [...data.parameters, { key: "", value: "" }] })}
            >
              <Plus className="size-3.5" /> Add parameter
            </Button>
          </div>
        </Field>

        <Field label="Tags">
          <TagEditor tags={data.tags} onChange={(tags) => update(selectedId, { tags })} />
        </Field>
      </div>

      <footer className="grid grid-cols-2 gap-2 border-t border-line bg-surface px-4 py-3">
        <Button
          onClick={() => {
            const res = addChild(selectedId);
            if (notify(res) && res.id) setTimeout(() => focusNodes([res.id!]), 60);
          }}
        >
          <CornerDownRight className="size-4" /> Add child
        </Button>
        <Button onClick={() => notify(duplicateNode(selectedId))}>
          <CopyPlus className="size-4" /> Duplicate
        </Button>
        <Button variant="danger" onClick={() => deleteNode(selectedId)}>
          <Trash2 className="size-4" /> Delete
        </Button>
        <Button variant="danger" disabled={childCount === 0} onClick={() => deleteNode(selectedId, true)} title="Delete this node and everything below it">
          <Trash2 className="size-4" /> Delete branch
        </Button>
      </footer>
    </aside>
  );
}
