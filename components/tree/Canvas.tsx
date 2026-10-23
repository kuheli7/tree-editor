"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type DefaultEdgeOptions,
  type FinalConnectionState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FileJson, Network, Plus, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { NODE_TEMPLATES } from "@/data/treeTemplates";
import { notify, useTreeActions } from "@/hooks/useTreeActions";
import { cn } from "@/lib/cn";
import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/tree/constants";
import { DND_MIME, type DragPayload } from "@/lib/tree/dnd";
import { checkConnection, selectSelectedId, useTreeStore } from "@/lib/tree/store";
import type { NodeKind, PolicyEdge, PolicyNode } from "@/types/tree";
import { policyNodeTypes } from "./PolicyNode";
import { Toolbar } from "./Toolbar";
import { treeEdgeTypes } from "./TreeEdge";

const MINIMAP_COLORS: Record<"light" | "dark", Record<NodeKind, string>> = {
  light: { root: "#7c3aed", rule: "#2563eb", condition: "#0891b2", action: "#059669" },
  dark: { root: "#a78bfa", rule: "#60a5fa", condition: "#22d3ee", action: "#34d399" },
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "tree",
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--muted)" },
};

const DROP_ATTR = "data-drop-target";

export function Canvas({ onOpenJson }: { onOpenJson: (tab: "export" | "import") => void }) {
  const nodes = useTreeStore((s) => s.nodes);
  const edges = useTreeStore((s) => s.edges);
  const showGrid = useTreeStore((s) => s.showGrid);
  const showMiniMap = useTreeStore((s) => s.showMiniMap);
  const isLayingOut = useTreeStore((s) => s.isLayingOut);
  const inspectorOpen = useTreeStore((s) => selectSelectedId(s) !== null);
  const onNodesChange = useTreeStore((s) => s.onNodesChange);
  const onEdgesChange = useTreeStore((s) => s.onEdgesChange);
  const beginDrag = useTreeStore((s) => s.beginDrag);
  const endDrag = useTreeStore((s) => s.endDrag);

  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  const flow = useReactFlow<PolicyNode, PolicyEdge>();
  const { focusNodes, addFromPalette } = useTreeActions();
  const dropTarget = useRef<HTMLElement | null>(null);
  const direction = useTreeStore((s) => s.direction);
  const updateNodeInternals = useUpdateNodeInternals();

  // Handles move sides when the orientation flips; React Flow caches their bounds until told to re-measure.
  useEffect(() => {
    updateNodeInternals(useTreeStore.getState().nodes.map((n) => n.id));
  }, [direction, updateNodeInternals]);

  const clearDropTarget = () => {
    dropTarget.current?.removeAttribute(DROP_ATTR);
    dropTarget.current = null;
  };

  const onConnect = useCallback((c: Connection) => {
    notify(useTreeStore.getState().connectNodes(c.source, c.target));
  }, []);

  /** React Flow silently refuses invalid drops; say why so it does not feel broken. */
  const onConnectEnd = useCallback((_: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (state.isValid !== false || !state.fromNode || !state.toNode) return;
    if (state.fromNode.id === state.toNode.id) return; // ignore tiny drags that end on the same node
    const [source, target] =
      state.fromHandle?.type === "target" ? [state.toNode.id, state.fromNode.id] : [state.fromNode.id, state.toNode.id];
    const { nodes, edges } = useTreeStore.getState();
    const check = checkConnection(nodes, edges, source, target);
    if (!check.ok) toast.error(check.reason); // report only — never apply here
  }, []);

  const onReconnect = useCallback((oldEdge: PolicyEdge, c: Connection) => {
    notify(useTreeStore.getState().connectNodes(c.source, c.target, oldEdge.id));
  }, []);

  /** Lets React Flow colour the connection line / refuse the drop while dragging. */
  const isValidConnection = useCallback((c: Connection | PolicyEdge) => {
    const { nodes, edges } = useTreeStore.getState();
    return checkConnection(nodes, edges, c.source, c.target).ok;
  }, []);

  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(DND_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const el = (e.target as HTMLElement).closest<HTMLElement>(".react-flow__node");
    if (el === dropTarget.current) return;
    clearDropTarget();
    if (el) {
      el.setAttribute(DROP_ATTR, "true");
      dropTarget.current = el;
    }
  };

  const onDrop = (e: DragEvent) => {
    const raw = e.dataTransfer.getData(DND_MIME);
    if (!raw) return;
    e.preventDefault();
    const hit = (e.target as HTMLElement).closest<HTMLElement>(".react-flow__node");
    clearDropTarget();

    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      return;
    }
    const preset = NODE_TEMPLATES.find((t) => t.id === payload.templateId)?.data;
    const state = useTreeStore.getState();

    // Dropped straight onto a node: become its child (the "link to an existing parent" gesture).
    const parentId = hit?.dataset.id;
    if (parentId) {
      const res = state.addChild(parentId, payload.kind, preset);
      if (notify(res) && res.id) setTimeout(() => focusNodes([res.id!]), 60);
      return;
    }

    const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    notify(state.addNode(payload.kind, { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 }, preset));
  };

  return (
    <div
      className={cn("relative h-full min-h-0 flex-1", inspectorOpen && "inspector-open")}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) clearDropTarget();
      }}
    >
      <ReactFlow<PolicyNode, PolicyEdge>
        className={cn(isLayingOut && "is-laying-out")}
        nodes={nodes}
        edges={edges}
        nodeTypes={policyNodeTypes}
        edgeTypes={treeEdgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onReconnect={onReconnect}
        isValidConnection={isValidConnection}
        onNodeDragStart={beginDrag}
        onNodeDragStop={endDrag}
        onDragOver={onDragOver}
        onDrop={onDrop}
        colorMode={mode}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={["Meta", "Control"]}
        snapToGrid={false}
        connectionRadius={36}
        zoomOnDoubleClick={false}
      >
        {showGrid && (
          <Background variant={BackgroundVariant.Lines} gap={32} lineWidth={1} color="var(--line)" style={{ opacity: 0.7 }} />
        )}
        <Controls showInteractive={false} showFitView={false} position="bottom-left" />
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            ariaLabel="Mini-map navigator"
            nodeColor={(n) => MINIMAP_COLORS[mode][(n.type as NodeKind) ?? "rule"]}
            nodeStrokeWidth={0}
            nodeBorderRadius={4}
          />
        )}
      </ReactFlow>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex">
        <Toolbar />
      </div>

      {nodes.length === 0 && <EmptyState onOpenJson={onOpenJson} onAdd={() => addFromPalette("root")} />}
    </div>
  );
}

function EmptyState({ onOpenJson, onAdd }: { onOpenJson: (tab: "export" | "import") => void; onAdd: () => void }) {
  const resetToSample = useTreeStore((s) => s.resetToSample);
  const { fitAll } = useTreeActions();

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6">
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-pop [animation:pop-in_260ms_var(--ease-out-expo)]">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Network className="size-6" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-ink">Start your policy tree</h2>
        <p className="mt-1 text-sm text-muted">
          Drag a node from the palette, import a JSON definition, or load the sample compliance policy.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={onAdd}>
            <Plus className="size-4" /> Add Root node
          </Button>
          <Button onClick={() => onOpenJson("import")}>
            <FileJson className="size-4" /> Import JSON
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetToSample();
              setTimeout(fitAll, 80);
            }}
          >
            <RotateCcw className="size-4" /> Load sample
          </Button>
        </div>
      </div>
    </div>
  );
}
