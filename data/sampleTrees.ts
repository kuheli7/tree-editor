/**
 * Import samples shown in the JSON modal. Positions are omitted on purpose:
 * the importer runs auto-layout when a file carries none.
 */

/** One orphaned rule plus a closed loop that is unreachable from the root — trips both validator checks. */
export const BROKEN_SAMPLE = {
  version: 1,
  name: "Broken sample (orphan + cycle)",
  nodes: [
    { id: "root", type: "root", data: { label: "Firm Compliance Policy", ruleId: "POL-2026", severity: "high", status: "active" } },
    { id: "r-ok", type: "rule", data: { label: "FINRA-2210 Communications", ruleId: "FINRA-2210", severity: "high", status: "active" } },
    { id: "c-ok", type: "condition", data: { label: "Contains projection?", ruleId: "COND-OK", severity: "medium", status: "active" } },
    { id: "a-ok", type: "action", data: { label: "Require approval", ruleId: "ACT-OK", severity: "low", status: "active" } },
    { id: "r-orphan", type: "rule", data: { label: "DISC-09 Fee Disclosure (never linked)", ruleId: "DISC-09", severity: "high", status: "draft" } },
    { id: "r-loop", type: "rule", data: { label: "Loop A: Escalation rule", ruleId: "LOOP-A", severity: "medium", status: "active" } },
    { id: "c-loop", type: "condition", data: { label: "Loop B: Needs review?", ruleId: "LOOP-B", severity: "medium", status: "active" } },
    { id: "a-loop", type: "action", data: { label: "Loop C: Re-run escalation", ruleId: "LOOP-C", severity: "medium", status: "active" } },
  ],
  edges: [
    { source: "root", target: "r-ok" },
    { source: "r-ok", target: "c-ok" },
    { source: "c-ok", target: "a-ok" },
    { source: "r-loop", target: "c-loop" },
    { source: "c-loop", target: "a-loop" },
    { source: "a-loop", target: "r-loop" },
  ],
};

/** Nested form — handy for hand-written trees. Kinds are inferred from depth when omitted. */
export const NESTED_SAMPLE = {
  name: "Nested sample",
  tree: {
    label: "Client Onboarding Policy",
    ruleId: "POL-ONB",
    severity: "high",
    status: "active",
    children: [
      {
        label: "Identity Verification",
        ruleId: "KYC-01",
        severity: "high",
        children: [
          {
            label: "ID document expired?",
            ruleId: "COND-KYC-A",
            children: [{ label: "Request fresh document", ruleId: "ACT-KYC-A" }],
          },
        ],
      },
      {
        label: "Fee Disclosure",
        ruleId: "DISC-09",
        severity: "medium",
        children: [
          {
            label: "Fee schedule attached?",
            ruleId: "COND-DISC-A",
            children: [{ label: "Block signature until attached", ruleId: "ACT-DISC-A", severity: "critical" }],
          },
        ],
      },
    ],
  },
};
