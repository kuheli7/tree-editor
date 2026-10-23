import { Crown, GitBranch, Gavel, Zap, type LucideIcon } from "lucide-react";
import type { NodeKind, NodeStatus, Severity } from "@/types/tree";

export const NODE_WIDTH = 252;
export const NODE_HEIGHT = 108;

export const STORAGE_KEY = "glynac-tree-editor-v1";
export const EXPORT_VERSION = 1;

type KindMeta = {
  label: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  defaultLabel: string;
  defaultRuleId: string;
};

export const KIND_ORDER: NodeKind[] = ["root", "rule", "condition", "action"];

export const KIND_META: Record<NodeKind, KindMeta> = {
  root: {
    label: "Root",
    hint: "Top of a policy hierarchy",
    icon: Crown,
    color: "var(--kind-root)",
    defaultLabel: "New policy root",
    defaultRuleId: "POL-ROOT",
  },
  rule: {
    label: "Rule",
    hint: "A regulatory or firm rule",
    icon: Gavel,
    color: "var(--kind-rule)",
    defaultLabel: "New rule",
    defaultRuleId: "RULE-NEW",
  },
  condition: {
    label: "Condition",
    hint: "Branches on a test or threshold",
    icon: GitBranch,
    color: "var(--kind-condition)",
    defaultLabel: "New condition",
    defaultRuleId: "COND-NEW",
  },
  action: {
    label: "Action",
    hint: "What happens when it fires",
    icon: Zap,
    color: "var(--kind-action)",
    defaultLabel: "New action",
    defaultRuleId: "ACT-NEW",
  },
};

/** Natural next level when adding a child under a parent of the given kind. */
export const DEFAULT_CHILD_KIND: Record<NodeKind, NodeKind> = {
  root: "rule",
  rule: "condition",
  condition: "action",
  action: "action",
};

export const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  low: { label: "Low", color: "var(--sev-low)" },
  medium: { label: "Medium", color: "var(--sev-medium)" },
  high: { label: "High", color: "var(--sev-high)" },
  critical: { label: "Critical", color: "var(--sev-critical)" },
};

export const STATUSES: NodeStatus[] = ["active", "draft", "disabled"];

export const STATUS_META: Record<NodeStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "var(--ok)" },
  draft: { label: "Draft", color: "var(--muted)" },
  disabled: { label: "Disabled", color: "var(--danger)" },
};
