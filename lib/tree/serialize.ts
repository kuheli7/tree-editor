import { z } from "zod";
import type {
  LayoutDirection,
  NodeKind,
  NodeStatus,
  Parameter,
  PolicyEdge,
  PolicyNode,
  PolicyNodeData,
  Severity,
} from "@/types/tree";
import { DEFAULT_CHILD_KIND, EXPORT_VERSION } from "./constants";
import { createEdge, defaultData, newId } from "./factory";
import { childrenMap, parentsMap } from "./graph";

/* ───────────────────────── Export ───────────────────────── */

export type FlatExport = {
  version: number;
  name: string;
  direction: LayoutDirection;
  nodes: { id: string; type: NodeKind; position: { x: number; y: number }; data: PolicyNodeData }[];
  edges: { id: string; source: string; target: string }[];
};

/** Lossless: keeps positions, orphans and anything else a nested tree could not represent. */
export function exportFlat(
  name: string,
  direction: LayoutDirection,
  nodes: PolicyNode[],
  edges: PolicyEdge[],
): FlatExport {
  return {
    version: EXPORT_VERSION,
    name,
    direction,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as NodeKind,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      data: n.data,
    })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}

type NestedOut = PolicyNodeData & { id: string; kind: NodeKind; children: NestedOut[] };

/** Human-friendly hierarchy. Cycles are cut and reported so the output is always finite. */
export function exportNested(name: string, nodes: PolicyNode[], edges: PolicyEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kids = childrenMap(edges);
  const parents = parentsMap(edges);
  const visited = new Set<string>();

  const build = (id: string): NestedOut | null => {
    const n = byId.get(id);
    if (!n || visited.has(id)) return null;
    visited.add(id);
    const children = (kids.get(id) ?? []).map(build).filter((c): c is NestedOut => c !== null);
    return { id, kind: n.type as NodeKind, ...n.data, children };
  };

  const roots = nodes.filter((n) => n.type === "root");
  const mainRoot = roots.length ? build(roots[0].id) : null;
  // Anything without a parent that is not the main root is detached: list it separately.
  const detached = nodes
    .filter((n) => !visited.has(n.id) && !parents.has(n.id))
    .map((n) => build(n.id))
    .filter((c): c is NestedOut => c !== null);
  const unreachable = nodes.filter((n) => !visited.has(n.id)).map((n) => n.id);

  return {
    version: EXPORT_VERSION,
    name,
    tree: mainRoot,
    ...(detached.length ? { detached } : {}),
    ...(unreachable.length ? { unreachable } : {}),
  };
}

/* ───────────────────────── Import ───────────────────────── */

const severity = z.enum(["low", "medium", "high", "critical"]);
const status = z.enum(["active", "draft", "disabled"]);
const kind = z.enum(["root", "rule", "condition", "action"]);

const parameters = z.union([
  z.array(z.object({ key: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) })),
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
]);

const dataShape = {
  ruleId: z.string().optional(),
  description: z.string().optional(),
  severity: severity.optional(),
  status: status.optional(),
  parameters: parameters.optional(),
  tags: z.array(z.string()).optional(),
};

const flatSchema = z.object({
  version: z.number().optional(),
  name: z.string().optional(),
  direction: z.enum(["TB", "LR"]).optional(),
  nodes: z.array(
    z.object({
      id: z.string().min(1, "id must not be empty"),
      type: kind,
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      data: z.object({ label: z.string(), ...dataShape }),
    }),
  ),
  edges: z
    .array(z.object({ id: z.string().optional(), source: z.string(), target: z.string() }))
    .optional(),
});

type NestedIn = {
  id?: string;
  kind?: NodeKind;
  label: string;
  ruleId?: string;
  description?: string;
  severity?: Severity;
  status?: NodeStatus;
  parameters?:
    | { key: string; value: string | number | boolean }[]
    | Record<string, string | number | boolean>;
  tags?: string[];
  children?: NestedIn[];
};

const nestedSchema: z.ZodType<NestedIn> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    kind: kind.optional(),
    label: z.string(),
    ...dataShape,
    children: z.array(nestedSchema).optional(),
  }),
);

const nestedWrapper = z.object({
  version: z.number().optional(),
  name: z.string().optional(),
  tree: nestedSchema,
});

export type ImportResult =
  | {
      ok: true;
      name?: string;
      direction?: LayoutDirection;
      nodes: PolicyNode[];
      edges: PolicyEdge[];
      /** True when the file had no coordinates, so the caller should run auto-layout. */
      needsLayout: boolean;
      format: "flat" | "nested";
    }
  | { ok: false; errors: string[] };

function normalizeParams(p: NestedIn["parameters"]): Parameter[] {
  if (!p) return [];
  if (Array.isArray(p)) return p.map((x) => ({ key: x.key, value: String(x.value) }));
  return Object.entries(p).map(([key, value]) => ({ key, value: String(value) }));
}

function toData(kindOfNode: NodeKind, src: Omit<NestedIn, "children" | "kind" | "id">): PolicyNodeData {
  return {
    ...defaultData(kindOfNode),
    label: src.label,
    ruleId: src.ruleId ?? "",
    description: src.description ?? "",
    severity: src.severity ?? defaultData(kindOfNode).severity,
    status: src.status ?? "active",
    parameters: normalizeParams(src.parameters),
    tags: src.tags ?? [],
  };
}

function formatZod(error: z.ZodError): string[] {
  const lines = error.issues.slice(0, 8).map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `${path}: ${i.message}`;
  });
  if (error.issues.length > 8) lines.push(`…and ${error.issues.length - 8} more problems`);
  return lines;
}

function importFlat(input: z.infer<typeof flatSchema>): ImportResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const n of input.nodes) {
    if (ids.has(n.id)) errors.push(`Duplicate node id “${n.id}”.`);
    ids.add(n.id);
  }
  for (const e of input.edges ?? []) {
    if (!ids.has(e.source)) errors.push(`Edge references unknown source “${e.source}”.`);
    if (!ids.has(e.target)) errors.push(`Edge references unknown target “${e.target}”.`);
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 8) };

  const needsLayout = input.nodes.length > 0 && input.nodes.every((n) => !n.position);
  const nodes: PolicyNode[] = input.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position ?? { x: 0, y: 0 },
    data: toData(n.type, n.data),
  }));

  const seen = new Set<string>();
  const edges: PolicyEdge[] = [];
  for (const e of input.edges ?? []) {
    const edge = createEdge(e.source, e.target);
    if (seen.has(edge.id)) continue;
    seen.add(edge.id);
    edges.push(edge);
  }

  return { ok: true, name: input.name, direction: input.direction, nodes, edges, needsLayout, format: "flat" };
}

function importNested(input: z.infer<typeof nestedWrapper>): ImportResult {
  const nodes: PolicyNode[] = [];
  const edges: PolicyEdge[] = [];
  const used = new Set<string>();
  const errors: string[] = [];

  const walk = (src: NestedIn, parent: PolicyNode | null) => {
    const k: NodeKind = src.kind ?? (parent ? DEFAULT_CHILD_KIND[parent.type as NodeKind] : "root");
    let id = src.id ?? newId(k);
    if (used.has(id)) {
      errors.push(`Duplicate node id “${id}”.`);
      id = newId(k);
    }
    used.add(id);
    const node: PolicyNode = { id, type: k, position: { x: 0, y: 0 }, data: toData(k, src) };
    nodes.push(node);
    if (parent) edges.push(createEdge(parent.id, id));
    for (const child of src.children ?? []) walk(child, node);
  };
  walk(input.tree, null);

  if (errors.length) return { ok: false, errors };
  return { ok: true, name: input.name, nodes, edges, needsLayout: true, format: "nested" };
}

export function parseImport(text: string): ImportResult {
  if (!text.trim()) return { ok: false, errors: ["Paste JSON or choose a file first."] };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: [`Not valid JSON — ${(err as Error).message}`] };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ["Expected a JSON object with `nodes` and `edges`, or a nested `tree`."] };
  }

  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.nodes)) {
    const parsed = flatSchema.safeParse(obj);
    return parsed.success ? importFlat(parsed.data) : { ok: false, errors: formatZod(parsed.error) };
  }
  if ("tree" in obj) {
    const parsed = nestedWrapper.safeParse(obj);
    return parsed.success ? importNested(parsed.data) : { ok: false, errors: formatZod(parsed.error) };
  }
  return {
    ok: false,
    errors: ["Unrecognised shape. Expected `{ nodes: [...], edges: [...] }` or `{ tree: { label, children } }`."],
  };
}
