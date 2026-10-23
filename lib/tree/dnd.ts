import type { NodeKind } from "@/types/tree";

/** Custom MIME type so the canvas only reacts to palette drags, not files or text. */
export const DND_MIME = "application/x-glynac-node";

export type DragPayload = { kind: NodeKind; templateId?: string };
