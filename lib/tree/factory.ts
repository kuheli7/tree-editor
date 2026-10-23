import type { NodeKind, PolicyEdge, PolicyNode, PolicyNodeData } from "@/types/tree";
import { KIND_META } from "./constants";
import { makeEdgeId } from "./graph";

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultData(kind: NodeKind): PolicyNodeData {
  const meta = KIND_META[kind];
  return {
    label: meta.defaultLabel,
    ruleId: meta.defaultRuleId,
    description: "",
    severity: kind === "action" ? "low" : "medium",
    status: "draft",
    parameters: [],
    tags: [],
  };
}

export function createNode(
  kind: NodeKind,
  position: { x: number; y: number },
  preset?: Partial<PolicyNodeData>,
): PolicyNode {
  return {
    id: newId(kind),
    type: kind,
    position,
    data: { ...defaultData(kind), ...preset },
  };
}

export function createEdge(source: string, target: string): PolicyEdge {
  return { id: makeEdgeId(source, target), source, target, type: "tree" };
}

export function cloneData(data: PolicyNodeData): PolicyNodeData {
  return {
    ...data,
    parameters: data.parameters.map((p) => ({ ...p })),
    tags: [...data.tags],
  };
}
