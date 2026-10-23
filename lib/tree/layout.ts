import dagre from "@dagrejs/dagre";
import type { LayoutDirection, PolicyEdge, PolicyNode } from "@/types/tree";
import { NODE_HEIGHT, NODE_WIDTH } from "./constants";

/**
 * Hierarchical auto-layout. Pure: returns new node objects with fresh positions
 * and leaves edges untouched. dagre copes with cycles and disconnected pieces,
 * so it is safe to run on a broken tree (orphans simply form their own columns).
 */
export function autoLayout(
  nodes: PolicyNode[],
  edges: PolicyEdge[],
  direction: LayoutDirection,
): PolicyNode[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: direction === "TB" ? 44 : 28,
    ranksep: direction === "TB" ? 84 : 110,
    marginx: 24,
    marginy: 24,
  });

  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const e of edges) {
    if (e.source !== e.target && ids.has(e.source) && ids.has(e.target)) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 } };
  });
}
