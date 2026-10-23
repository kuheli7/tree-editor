import type { Edge, Node } from "@xyflow/react";

export type NodeKind = "root" | "rule" | "condition" | "action";
export type Severity = "low" | "medium" | "high" | "critical";
export type NodeStatus = "active" | "draft" | "disabled";
export type LayoutDirection = "TB" | "LR";

export type Parameter = { key: string; value: string };

// `type` (not interface) so it satisfies React Flow's Record<string, unknown> constraint.
export type PolicyNodeData = {
  label: string;
  ruleId: string;
  description: string;
  severity: Severity;
  status: NodeStatus;
  parameters: Parameter[];
  tags: string[];
};

export type PolicyNode = Node<PolicyNodeData, NodeKind>;
export type PolicyEdge = Edge;

export type TreeSnapshot = {
  nodes: PolicyNode[];
  edges: PolicyEdge[];
};

export type IssueType = "orphan" | "cycle" | "no-root" | "multi-root" | "multi-parent";

export type ValidationIssue = {
  id: string;
  type: IssueType;
  level: "error" | "warning";
  message: string;
  nodeIds: string[];
};

export type ValidationResult = {
  issues: ValidationIssue[];
  /** nodeId -> most severe issue touching that node, used to ring nodes on the canvas. */
  flagged: Record<string, IssueType>;
  ok: boolean;
};
