import type { NodeKind, PolicyNodeData } from "@/types/tree";

export type NodeTemplate = {
  id: string;
  kind: NodeKind;
  title: string;
  subtitle: string;
  data: Partial<PolicyNodeData>;
};

/** Pre-filled nodes shown in the palette so common compliance building blocks are one drag away. */
export const NODE_TEMPLATES: NodeTemplate[] = [
  {
    id: "tpl-disc-09",
    kind: "rule",
    title: "DISC-09 Fee Disclosure",
    subtitle: "Rule · High",
    data: {
      label: "Fee & Conflict Disclosure",
      ruleId: "DISC-09",
      description: "Requires the fee schedule and any conflicts of interest to be disclosed in client-facing agreements.",
      severity: "high",
      status: "draft",
      parameters: [
        { key: "applies_to", value: "Investment agreements" },
        { key: "required_section", value: "Section 4" },
      ],
      tags: ["disclosure", "fees"],
    },
  },
  {
    id: "tpl-guaranteed-return",
    kind: "condition",
    title: "Guaranteed-return clause",
    subtitle: "Condition · High",
    data: {
      label: "Contains guaranteed-return clause?",
      ruleId: "COND-GRC",
      description: "Matches language that promises or implies a guaranteed rate of return.",
      severity: "high",
      status: "draft",
      parameters: [{ key: "lexicon", value: "guarantee-terms-v2" }],
      tags: ["guarantee"],
    },
  },
  {
    id: "tpl-pii-mask",
    kind: "action",
    title: "Mask client PII",
    subtitle: "Action · Medium",
    data: {
      label: "Mask client PII",
      ruleId: "ACT-PII",
      description: "Redact names, SSNs and account numbers before the document leaves the firm.",
      severity: "medium",
      status: "draft",
      parameters: [{ key: "engine", value: "presidio" }],
      tags: ["privacy"],
    },
  },
];
