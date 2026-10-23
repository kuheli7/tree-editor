import {
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMockTree } from "@/data/mockTree";
import type {
  LayoutDirection,
  NodeKind,
  PolicyEdge,
  PolicyNode,
  PolicyNodeData,
  TreeSnapshot,
} from "@/types/tree";
import { DEFAULT_CHILD_KIND, NODE_HEIGHT, NODE_WIDTH, STORAGE_KEY } from "./constants";
import { cloneData, createEdge, createNode } from "./factory";
import { descendantsOf, wouldCreateCycle } from "./graph";
import { autoLayout } from "./layout";
import type { ImportResult } from "./serialize";

export type ActionResult = { ok: true; message?: string } | { ok: false; reason: string };

/**
 * Pure rule check for a prospective parent -> child link. Shared by the store, React Flow's
 * live `isValidConnection`, and the drop-rejected toast, so they can never disagree.
 * `replaceEdgeId` validates as if that edge were already gone (used when dragging an edge end).
 */
export function checkConnection(
  nodes: PolicyNode[],
  allEdges: PolicyEdge[],
  source: string,
  target: string,
  replaceEdgeId?: string,
): ActionResult {
  const edges = allEdges.filter((e) => e.id !== replaceEdgeId);
  const src = nodes.find((n) => n.id === source);
  const tgt = nodes.find((n) => n.id === target);
  if (!src || !tgt) return { ok: false, reason: "Both nodes must exist." };
  if (source === target) return { ok: false, reason: "A node can’t connect to itself." };
  if (tgt.type === "root") return { ok: false, reason: "A Root node can’t have a parent." };
  if (edges.some((e) => e.source === source && e.target === target)) {
    return { ok: false, reason: "These nodes are already connected." };
  }
  if (wouldCreateCycle(source, target, edges)) {
    return {
      ok: false,
      reason: `That would create a circular reference (“${src.data.label}” is already below “${tgt.data.label}”).`,
    };
  }
  return { ok: true };
}

const HISTORY_LIMIT = 60;
const initial = createMockTree();

type TreeState = {
  name: string;
  nodes: PolicyNode[];
  edges: PolicyEdge[];
  direction: LayoutDirection;
  showGrid: boolean;
  showMiniMap: boolean;
  search: string;
  isLayingOut: boolean;
  hydrated: boolean;
  past: TreeSnapshot[];
  future: TreeSnapshot[];

  // React Flow plumbing
  onNodesChange: (changes: NodeChange<PolicyNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<PolicyEdge>[]) => void;
  beginDrag: () => void;
  endDrag: () => void;

  // Structural actions
  addNode: (kind: NodeKind, position: { x: number; y: number }, preset?: Partial<PolicyNodeData>) => ActionResult & { id?: string };
  addChild: (parentId: string, kind?: NodeKind, preset?: Partial<PolicyNodeData>) => ActionResult & { id?: string };
  duplicateNode: (id: string) => ActionResult & { id?: string };
  deleteNode: (id: string, withDescendants?: boolean) => void;
  connectNodes: (source: string, target: string, replaceEdgeId?: string) => ActionResult;
  removeEdge: (id: string) => void;
  setParent: (id: string, parentId: string | null) => ActionResult;
  changeKind: (id: string, kind: NodeKind) => ActionResult;
  updateNodeData: (id: string, patch: Partial<PolicyNodeData>) => void;
  runAutoLayout: () => void;
  finishLayout: () => void;
  importTree: (result: Extract<ImportResult, { ok: true }>) => void;
  resetToSample: () => void;
  clearTree: () => void;

  // View state
  selectOnly: (id: string | null) => void;
  setSearch: (q: string) => void;
  toggleGrid: () => void;
  toggleMiniMap: () => void;
  setDirection: (d: LayoutDirection) => void;
  setName: (name: string) => void;

  // History
  undo: () => void;
  redo: () => void;
};

let lastCheckpointKey = "";
let lastCheckpointAt = 0;
let dragStart: TreeSnapshot | null = null;
let lastEditId = "";
let lastEditAt = 0;

export const useTreeStore = create<TreeState>()(
  persist(
    (set, get) => {
      const snapshot = (): TreeSnapshot => ({ nodes: get().nodes, edges: get().edges });

      /** Record the current graph so the next change can be undone. Same-key calls inside `windowMs` collapse. */
      const checkpoint = (key = "", windowMs = 0) => {
        const now = Date.now();
        if (key && key === lastCheckpointKey && now - lastCheckpointAt < windowMs) return;
        lastCheckpointKey = key;
        lastCheckpointAt = now;
        set((s) => ({ past: [...s.past, snapshot()].slice(-HISTORY_LIMIT), future: [] }));
      };

      const deselected = (nodes: PolicyNode[]) => nodes.map((n) => (n.selected ? { ...n, selected: false } : n));

      const withNew = (node: PolicyNode, edge?: PolicyEdge) => {
        set((s) => ({
          nodes: [...deselected(s.nodes), { ...node, selected: true }],
          edges: edge ? [...s.edges, edge] : s.edges,
        }));
      };

      return {
        name: "Firm Compliance Policy",
        nodes: initial.nodes,
        edges: initial.edges,
        direction: "TB",
        showGrid: true,
        showMiniMap: true,
        search: "",
        isLayingOut: false,
        hydrated: false,
        past: [],
        future: [],

        onNodesChange: (changes) => {
          if (changes.some((c) => c.type === "remove")) checkpoint("rf-delete", 150);
          set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
        },
        onEdgesChange: (changes) => {
          if (changes.some((c) => c.type === "remove")) checkpoint("rf-delete", 150);
          set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
        },
        beginDrag: () => {
          dragStart = snapshot();
        },
        endDrag: () => {
          if (!dragStart) return;
          const moved = get().nodes.some((n) => {
            const before = dragStart!.nodes.find((b) => b.id === n.id);
            return before && (before.position.x !== n.position.x || before.position.y !== n.position.y);
          });
          if (moved) set((s) => ({ past: [...s.past, dragStart!].slice(-HISTORY_LIMIT), future: [] }));
          dragStart = null;
        },

        addNode: (kind, position, preset) => {
          if (kind === "root" && get().nodes.some((n) => n.type === "root")) {
            return { ok: false, reason: "A tree can only have one Root node." };
          }
          checkpoint();
          const node = createNode(kind, position, preset);
          withNew(node);
          return { ok: true, id: node.id };
        },

        addChild: (parentId, kind, preset) => {
          const { nodes, edges, direction } = get();
          const parent = nodes.find((n) => n.id === parentId);
          if (!parent) return { ok: false, reason: "Parent node no longer exists." };
          const childKind = kind ?? DEFAULT_CHILD_KIND[parent.type as NodeKind];
          if (childKind === "root") return { ok: false, reason: "A Root node cannot be a child." };

          const siblings = edges
            .filter((e) => e.source === parentId)
            .map((e) => nodes.find((n) => n.id === e.target))
            .filter((n): n is PolicyNode => !!n);

          const gap = 36;
          let position: { x: number; y: number };
          if (direction === "TB") {
            position = {
              x: siblings.length ? Math.max(...siblings.map((s) => s.position.x)) + NODE_WIDTH + gap : parent.position.x,
              y: parent.position.y + NODE_HEIGHT + 84,
            };
          } else {
            position = {
              x: parent.position.x + NODE_WIDTH + 110,
              y: siblings.length ? Math.max(...siblings.map((s) => s.position.y)) + NODE_HEIGHT + gap : parent.position.y,
            };
          }

          checkpoint();
          const node = createNode(childKind, position, preset);
          withNew(node, createEdge(parentId, node.id));
          return { ok: true, id: node.id };
        },

        duplicateNode: (id) => {
          const { nodes, edges } = get();
          const original = nodes.find((n) => n.id === id);
          if (!original) return { ok: false, reason: "Node no longer exists." };
          if (original.type === "root") return { ok: false, reason: "Root cannot be duplicated — a tree has one Root." };

          const copy = createNode(original.type as NodeKind, { x: original.position.x + 40, y: original.position.y + 40 }, {
            ...cloneData(original.data),
            label: `${original.data.label} (copy)`,
            ruleId: original.data.ruleId ? `${original.data.ruleId}-copy` : "",
            status: "draft",
          });
          const parentEdge = edges.find((e) => e.target === id);
          checkpoint();
          withNew(copy, parentEdge ? createEdge(parentEdge.source, copy.id) : undefined);
          return { ok: true, id: copy.id };
        },

        deleteNode: (id, withDescendants = false) => {
          const { edges } = get();
          const doomed = new Set([id]);
          if (withDescendants) descendantsOf(id, edges).forEach((d) => doomed.add(d));
          checkpoint();
          set((s) => ({
            nodes: s.nodes.filter((n) => !doomed.has(n.id)),
            edges: s.edges.filter((e) => !doomed.has(e.source) && !doomed.has(e.target)),
          }));
        },

        connectNodes: (source, target, replaceEdgeId) => {
          const { nodes } = get();
          const check = checkConnection(nodes, get().edges, source, target, replaceEdgeId);
          if (!check.ok) return check;

          const src = nodes.find((n) => n.id === source)!;
          const tgt = nodes.find((n) => n.id === target)!;
          const previous = get().edges.filter((e) => e.target === target && e.id !== replaceEdgeId);
          checkpoint();
          set((s) => ({
            edges: [...s.edges.filter((e) => e.target !== target && e.id !== replaceEdgeId), createEdge(source, target)],
          }));
          return {
            ok: true,
            message: previous.length
              ? `Re-parented “${tgt.data.label}” under “${src.data.label}”.`
              : `Linked “${src.data.label}” → “${tgt.data.label}”.`,
          };
        },

        removeEdge: (id) => {
          checkpoint();
          set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
        },

        setParent: (id, parentId) => {
          if (parentId === null) {
            checkpoint();
            set((s) => ({ edges: s.edges.filter((e) => e.target !== id) }));
            return { ok: true, message: "Detached from parent." };
          }
          return get().connectNodes(parentId, id);
        },

        changeKind: (id, kind) => {
          const { nodes, edges } = get();
          const node = nodes.find((n) => n.id === id);
          if (!node || node.type === kind) return { ok: true };
          if (kind === "root") {
            if (nodes.some((n) => n.type === "root")) return { ok: false, reason: "A tree can only have one Root node." };
            if (edges.some((e) => e.target === id)) {
              return { ok: false, reason: "Detach this node from its parent before making it the Root." };
            }
          }
          checkpoint();
          set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, type: kind } : n)) }));
          return { ok: true };
        },

        updateNodeData: (id, patch) => {
          // Typing fires this on every keystroke; treat one burst of edits to one node as one undo step.
          const now = Date.now();
          if (id !== lastEditId || now - lastEditAt > 1200) checkpoint();
          lastEditId = id;
          lastEditAt = now;
          set((s) => ({
            nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
          }));
        },

        runAutoLayout: () => {
          const { nodes, edges, direction } = get();
          if (!nodes.length) return;
          checkpoint();
          set({ isLayingOut: true, nodes: autoLayout(nodes, edges, direction) });
        },
        finishLayout: () => set({ isLayingOut: false }),

        importTree: (result) => {
          checkpoint();
          const direction = result.direction ?? get().direction;
          set({
            name: result.name ?? get().name,
            direction,
            edges: result.edges,
            nodes: result.needsLayout ? autoLayout(result.nodes, result.edges, direction) : result.nodes,
            search: "",
          });
        },

        resetToSample: () => {
          const fresh = createMockTree();
          checkpoint();
          set({ name: "Firm Compliance Policy", nodes: fresh.nodes, edges: fresh.edges, direction: "TB", search: "" });
        },

        clearTree: () => {
          checkpoint();
          set({ nodes: [], edges: [], search: "" });
        },

        selectOnly: (id) => set((s) => ({ nodes: s.nodes.map((n) => ((n.id === id) !== !!n.selected ? { ...n, selected: n.id === id } : n)) })),
        setSearch: (search) => set({ search }),
        toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
        toggleMiniMap: () => set((s) => ({ showMiniMap: !s.showMiniMap })),
        setDirection: (direction) => set({ direction }),
        setName: (name) => set({ name }),

        undo: () => {
          const { past, future } = get();
          const prev = past[past.length - 1];
          if (!prev) return;
          set({ nodes: prev.nodes, edges: prev.edges, past: past.slice(0, -1), future: [...future, snapshot()] });
        },
        redo: () => {
          const { past, future } = get();
          const next = future[future.length - 1];
          if (!next) return;
          set({ nodes: next.nodes, edges: next.edges, future: future.slice(0, -1), past: [...past, snapshot()] });
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Render from defaults first, then call persist.rehydrate() after mount to avoid SSR mismatches.
      skipHydration: true,
      partialize: (s) => ({
        name: s.name,
        direction: s.direction,
        showGrid: s.showGrid,
        showMiniMap: s.showMiniMap,
        edges: s.edges,
        nodes: s.nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
      }),
    },
  ),
);

export const selectSelectedId = (s: TreeState): string | null => {
  let id: string | null = null;
  for (const n of s.nodes) {
    if (!n.selected) continue;
    if (id) return null; // multi-selection: no single inspector target
    id = n.id;
  }
  return id;
};
