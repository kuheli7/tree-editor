"use client";

import { AlertTriangle, Check, Copy, Download, FileJson, Upload } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BROKEN_SAMPLE, NESTED_SAMPLE } from "@/data/sampleTrees";
import { useTreeActions } from "@/hooks/useTreeActions";
import { cn } from "@/lib/cn";
import { exportFlat, exportNested, parseImport } from "@/lib/tree/serialize";
import { useTreeStore } from "@/lib/tree/store";
import { validateTree } from "@/lib/tree/validate";
import { useValidation } from "./ValidationContext";

type Tab = "export" | "import";
type Format = "flat" | "nested";

function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-surface-2 p-1">
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          type="button"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            value === it.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function JsonModal({ open, onClose, initialTab = "export" }: { open: boolean; onClose: () => void; initialTab?: Tab }) {
  // Parent remounts this component per opening (via `key`), so initial state is always fresh.
  const [tab, setTab] = useState<Tab>(initialTab);
  const [format, setFormat] = useState<Format>("flat");
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const name = useTreeStore((s) => s.name);
  const direction = useTreeStore((s) => s.direction);
  const nodes = useTreeStore((s) => s.nodes);
  const edges = useTreeStore((s) => s.edges);
  const importTree = useTreeStore((s) => s.importTree);
  const { issues } = useValidation();
  const { fitAll } = useTreeActions();

  const exported = useMemo(() => {
    const data = format === "flat" ? exportFlat(name, direction, nodes, edges) : exportNested(name, nodes, edges);
    return JSON.stringify(data, null, 2);
  }, [format, name, direction, nodes, edges]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exported);
      setCopied(true);
      toast.success("JSON copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard is unavailable — select the text and copy manually.");
    }
  };

  const download = () => {
    const blob = new Blob([exported], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "policy-tree").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setErrors(["File is larger than 5 MB."]);
    setText(await file.text());
    setErrors([]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void readFile(e.dataTransfer.files[0]);
  };

  const runImport = () => {
    const result = parseImport(text);
    if (!result.ok) return setErrors(result.errors);
    importTree(result);
    setErrors([]);
    onClose();
    setTimeout(fitAll, 80);

    const { nodes: n, edges: e } = useTreeStore.getState();
    const problems = validateTree(n, e).issues.length;
    if (problems)
      toast.warning(`Imported ${result.nodes.length} nodes — ${problems} validation problem${problems === 1 ? "" : "s"} found.`, {
        description: "Check the Validation panel.",
      });
    else toast.success(`Imported ${result.nodes.length} nodes and ${result.edges.length} links.`);
  };

  const loadSample = (sample: object) => {
    setText(JSON.stringify(sample, null, 2));
    setErrors([]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tree JSON"
      description="Export the current policy tree or import a definition to replace it."
      className="max-w-3xl"
      footer={
        tab === "export" ? (
          <>
            <Button onClick={copy}>
              {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="primary" onClick={download}>
              <Download className="size-4" /> Download .json
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={runImport} disabled={!text.trim()}>
              <Upload className="size-4" /> Import &amp; replace canvas
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { id: "export", label: "Export" },
              { id: "import", label: "Import" },
            ]}
          />
          {tab === "export" && (
            <Tabs<Format>
              value={format}
              onChange={setFormat}
              items={[
                { id: "flat", label: "Graph (lossless)" },
                { id: "nested", label: "Nested view" },
              ]}
            />
          )}
        </div>

        {tab === "export" ? (
          <>
            {issues.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  This tree has {issues.length} validation problem{issues.length === 1 ? "" : "s"}. It will export as-is.
                  {format === "nested" && " Detached or cyclic nodes are listed separately in the nested view."}
                </span>
              </p>
            )}
            <p className="text-xs text-muted">
              {format === "flat"
                ? "Nodes, links and canvas positions — re-importing restores the tree exactly."
                : "Readable hierarchy under the Root. Can be re-imported, but positions are recalculated."}
            </p>
            <pre
              tabIndex={0}
              aria-label="Exported JSON"
              className="thin-scroll max-h-[46dvh] overflow-auto rounded-xl border border-line bg-surface-2 p-4 font-mono text-xs leading-relaxed text-ink"
            >
              {exported}
            </pre>
          </>
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-3 transition",
                dragging ? "border-accent bg-accent/10" : "border-line",
              )}
            >
              <div className="flex items-center gap-2.5 text-sm text-muted">
                <FileJson className="size-5" />
                <span>Drop a .json file here, or</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    void readFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button size="sm" onClick={() => fileRef.current?.click()}>
                  Choose file
                </Button>
                <Button size="sm" variant="ghost" onClick={() => loadSample(NESTED_SAMPLE)}>
                  Nested sample
                </Button>
                <Button size="sm" variant="ghost" onClick={() => loadSample(BROKEN_SAMPLE)}>
                  Broken sample (orphan + cycle)
                </Button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setErrors([]);
              }}
              spellCheck={false}
              rows={14}
              aria-label="JSON to import"
              placeholder='{ "nodes": [...], "edges": [...] }   or   { "tree": { "label": "...", "children": [...] } }'
              className="thin-scroll w-full resize-y rounded-xl border border-line bg-surface-2 p-4 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
            />

            {errors.length > 0 && (
              <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                <p className="font-semibold">Can’t import this JSON</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
