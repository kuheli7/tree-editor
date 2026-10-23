import type { PolicyEdge } from "@/types/tree";

/** nodeId -> ids of nodes it points to. */
export function childrenMap(edges: PolicyEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    const list = map.get(e.source);
    if (list) list.push(e.target);
    else map.set(e.source, [e.target]);
  }
  return map;
}

/** nodeId -> ids of nodes pointing at it. */
export function parentsMap(edges: PolicyEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    const list = map.get(e.target);
    if (list) list.push(e.source);
    else map.set(e.target, [e.source]);
  }
  return map;
}

/** Every node reachable from `id` (excluding `id` itself). Safe on cyclic graphs. */
export function descendantsOf(id: string, edges: PolicyEdge[]): Set<string> {
  const children = childrenMap(edges);
  const seen = new Set<string>();
  const stack = [...(children.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    if (next === id || seen.has(next)) continue;
    seen.add(next);
    stack.push(...(children.get(next) ?? []));
  }
  return seen;
}

/**
 * Would adding `source -> target` close a loop? True for self-loops and when
 * `source` is already somewhere below `target`.
 */
export function wouldCreateCycle(source: string, target: string, edges: PolicyEdge[]): boolean {
  if (source === target) return true;
  return descendantsOf(target, edges).has(source);
}

export function makeEdgeId(source: string, target: string): string {
  return `e-${source}-${target}`;
}
