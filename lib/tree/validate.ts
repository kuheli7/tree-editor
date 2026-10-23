import type { IssueType, PolicyEdge, PolicyNode, ValidationIssue, ValidationResult } from "@/types/tree";
import { childrenMap, parentsMap } from "./graph";

/** Highest priority first; decides which badge a node shows when it has several problems. */
const FLAG_PRIORITY: IssueType[] = ["cycle", "orphan", "multi-root", "no-root", "multi-parent"];

/**
 * Tarjan's strongly-connected-components. Any SCC with >1 node (or a self-loop)
 * is a circular reference. Iterative so a 10k-node import cannot blow the stack.
 */
function findCycles(nodeIds: string[], edges: PolicyEdge[]): string[][] {
  const children = childrenMap(edges);
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result: string[][] = [];
  let counter = 0;

  for (const start of nodeIds) {
    if (index.has(start)) continue;
    const work: { id: string; i: number }[] = [{ id: start, i: 0 }];
    index.set(start, counter);
    low.set(start, counter);
    counter++;
    stack.push(start);
    onStack.add(start);

    while (work.length) {
      const frame = work[work.length - 1];
      const next = children.get(frame.id) ?? [];
      if (frame.i < next.length) {
        const w = next[frame.i++];
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter);
          counter++;
          stack.push(w);
          onStack.add(w);
          work.push({ id: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.id, Math.min(low.get(frame.id)!, index.get(w)!));
        }
      } else {
        if (low.get(frame.id) === index.get(frame.id)) {
          const component: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            component.push(w);
          } while (w !== frame.id);
          const selfLoop = component.length === 1 && (children.get(w) ?? []).includes(w);
          if (component.length > 1 || selfLoop) result.push(component);
        }
        work.pop();
        const parent = work[work.length - 1];
        if (parent) low.set(parent.id, Math.min(low.get(parent.id)!, low.get(frame.id)!));
      }
    }
  }
  return result;
}

/** Walk the component once so the message can read "A → B → C → A". */
function cyclePath(component: string[], edges: PolicyEdge[]): string[] {
  const inside = new Set(component);
  const children = childrenMap(edges);
  const path = [component[0]];
  const seen = new Set(path);
  let current = component[0];
  for (;;) {
    const options = (children.get(current) ?? []).filter((c) => inside.has(c));
    const unseen = options.find((c) => !seen.has(c));
    if (!unseen) break;
    path.push(unseen);
    seen.add(unseen);
    current = unseen;
  }
  return path;
}

export function validateTree(nodes: PolicyNode[], edges: PolicyEdge[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const labelOf = new Map(nodes.map((n) => [n.id, n.data.label || n.id]));
  const name = (id: string) => `“${labelOf.get(id) ?? id}”`;

  const parents = parentsMap(edges);
  const roots = nodes.filter((n) => n.type === "root");

  if (nodes.length === 0) return { issues, flagged: {}, ok: true };

  if (roots.length === 0) {
    issues.push({
      id: "no-root",
      type: "no-root",
      level: "error",
      message: "The tree has no Root node. Add one to anchor the hierarchy.",
      nodeIds: [],
    });
  } else if (roots.length > 1) {
    issues.push({
      id: "multi-root",
      type: "multi-root",
      level: "error",
      message: `${roots.length} Root nodes found — a policy tree should have exactly one.`,
      nodeIds: roots.map((r) => r.id),
    });
  }

  // Orphans: anything that is not a root but has no parent.
  for (const n of nodes) {
    if (n.type === "root") continue;
    if (!parents.has(n.id)) {
      issues.push({
        id: `orphan-${n.id}`,
        type: "orphan",
        level: "error",
        message: `${name(n.id)} is orphaned — it has no parent connection.`,
        nodeIds: [n.id],
      });
    }
  }

  // Roots should not have parents.
  for (const r of roots) {
    const incoming = parents.get(r.id);
    if (incoming?.length) {
      issues.push({
        id: `root-parent-${r.id}`,
        type: "multi-parent",
        level: "warning",
        message: `Root ${name(r.id)} should not have a parent, but is linked from ${name(incoming[0])}.`,
        nodeIds: [r.id, ...incoming],
      });
    }
  }

  // More than one parent breaks the "tree" property.
  for (const [id, incoming] of parents) {
    if (incoming.length > 1 && labelOf.has(id) && roots.every((r) => r.id !== id)) {
      issues.push({
        id: `multi-parent-${id}`,
        type: "multi-parent",
        level: "warning",
        message: `${name(id)} has ${incoming.length} parents; a tree node should have one.`,
        nodeIds: [id, ...incoming],
      });
    }
  }

  // Circular references — the validator must cope with these even though the UI blocks them,
  // because imported JSON can contain anything.
  for (const component of findCycles(
    nodes.map((n) => n.id),
    edges,
  )) {
    const path = cyclePath(component, edges);
    const names = [...path, path[0]].map(name).join(" → ");
    issues.push({
      id: `cycle-${[...component].sort().join("|")}`,
      type: "cycle",
      level: "error",
      message: `Circular reference: ${names}`,
      nodeIds: component,
    });
  }

  const flagged: Record<string, IssueType> = {};
  for (const type of [...FLAG_PRIORITY].reverse()) {
    for (const issue of issues) {
      if (issue.type !== type) continue;
      for (const id of issue.nodeIds) flagged[id] = type;
    }
  }

  return { issues, flagged, ok: !issues.some((i) => i.level === "error") };
}
