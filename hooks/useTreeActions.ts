"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { toast } from "sonner";
import { NODE_HEIGHT, NODE_WIDTH } from "@/lib/tree/constants";
import { selectSelectedId, useTreeStore, type ActionResult } from "@/lib/tree/store";
import type { NodeKind, PolicyNodeData } from "@/types/tree";

/** Surface a store result to the user: errors always, success only when it has something to say. */
export function notify(result: ActionResult) {
  if (!result.ok) toast.error(result.reason);
  else if (result.message) toast.success(result.message);
  return result.ok;
}

/** Imperative helpers shared by the palette, toolbar, inspector and validation panel. */
export function useTreeActions() {
  const flow = useReactFlow();

  const fitAll = useCallback(() => flow.fitView({ padding: 0.1, duration: 500 }), [flow]);

  const focusNodes = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      flow.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.5, maxZoom: 1.15, duration: 550 });
    },
    [flow],
  );

  /** Select one node and bring it into view. */
  const focusNode = useCallback(
    (id: string) => {
      useTreeStore.getState().selectOnly(id);
      focusNodes([id]);
    },
    [focusNodes],
  );

  /**
   * Click-to-add (the touch / keyboard alternative to dragging): becomes a child of the
   * selected node when there is one, otherwise lands in the middle of the visible canvas.
   */
  const addFromPalette = useCallback(
    (kind: NodeKind, preset?: Partial<PolicyNodeData>) => {
      const state = useTreeStore.getState();
      const selectedId = selectSelectedId(state);

      if (selectedId && kind !== "root") {
        const res = state.addChild(selectedId, kind, preset);
        if (notify(res) && res.id) setTimeout(() => focusNodes([res.id!]), 60);
        return;
      }

      const bounds = document.querySelector(".react-flow")?.getBoundingClientRect();
      const center = bounds
        ? flow.screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 })
        : { x: 0, y: 0 };
      const res = state.addNode(kind, { x: center.x - NODE_WIDTH / 2, y: center.y - NODE_HEIGHT / 2 }, preset);
      notify(res);
    },
    [flow, focusNodes],
  );

  const autoLayout = useCallback(() => {
    const state = useTreeStore.getState();
    if (!state.nodes.length) return;
    state.runAutoLayout();
    // Let the new positions mount with the CSS glide enabled, then frame them.
    setTimeout(() => flow.fitView({ padding: 0.1, duration: 600 }), 60);
    setTimeout(() => useTreeStore.getState().finishLayout(), 700);
  }, [flow]);

  return { fitAll, focusNode, focusNodes, addFromPalette, autoLayout };
}
