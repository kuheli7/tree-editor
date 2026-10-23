import type { PolicyNodeData } from "@/types/tree";

/** Case-insensitive match across everything a user might remember about a node. */
export function nodeMatches(kind: string | undefined, data: PolicyNodeData, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const { label, ruleId, description, tags, parameters } = data;
  return [label, ruleId, description, kind ?? "", ...tags, ...parameters.flatMap((p) => [p.key, p.value])]
    .join("\u0000")
    .toLowerCase()
    .includes(q);
}
