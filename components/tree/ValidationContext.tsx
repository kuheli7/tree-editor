"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { validateTree } from "@/lib/tree/validate";
import { useTreeStore } from "@/lib/tree/store";
import type { ValidationResult } from "@/types/tree";

const EMPTY: ValidationResult = { issues: [], flagged: {}, ok: true };
const ValidationContext = createContext<ValidationResult>(EMPTY);

/**
 * Validation depends only on graph structure (ids, kinds, labels, links) — not on node
 * positions — so it is keyed on a cheap signature and does not re-run while dragging.
 */
export function ValidationProvider({ children }: { children: ReactNode }) {
  const signature = useTreeStore(
    (s) =>
      s.nodes.map((n) => `${n.id}:${n.type}:${n.data.label}`).join("|") +
      "#" +
      s.edges.map((e) => `${e.source}>${e.target}`).join("|"),
  );

  const result = useMemo(() => {
    const { nodes, edges } = useTreeStore.getState();
    return validateTree(nodes, edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` is the intentional trigger
  }, [signature]);

  return <ValidationContext.Provider value={result}>{children}</ValidationContext.Provider>;
}

export function useValidation(): ValidationResult {
  return useContext(ValidationContext);
}
