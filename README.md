# Glynac Platform — Policy Tree Editor (FE-4)

An interactive visual tree editor for compliance policy hierarchies, built from scratch with
**Next.js (App Router) · TypeScript (strict) · TailwindCSS v4 · React Flow (`@xyflow/react`) · Zustand**.

Compliance officers build rule trees (Root → Rule → Condition → Action) on a canvas, edit node
properties in a slide-over inspector, validate the structure, auto-layout it, and import/export JSON.

```bash
npm install
npm run dev        # http://localhost:3000  → "Policy Tree Editor" card, or go straight to /tree
npm run build      # type-checks in strict mode
npm run lint
```

## Features (mapped to the task)

| Requirement | Where |
| --- | --- |
| Canvas with zoom, pan, grid toggle, reset view | `Canvas.tsx`, `Toolbar.tsx` (grid / mini-map toggles, **Reset view**) |
| Distinct node types, colour badges, status + severity | `PolicyNode.tsx`, `badges.tsx` |
| Palette → drag nodes onto canvas | `Palette.tsx` (HTML5 drag-and-drop; click-to-add as fallback) |
| Parent → child links, re-parent, duplicate, delete | `store.ts` (`connectNodes`, `setParent`, `duplicateNode`, `deleteNode`) |
| Properties inspector (label, rule ID, description, severity, parameters, tags) | `Inspector.tsx` — edits are live |
| Search highlight, Auto-Layout, Mini-map | `Toolbar.tsx`, `lib/tree/layout.ts` (dagre), `MiniMap` |
| JSON import / export | `JsonModal.tsx`, `lib/tree/serialize.ts` (zod-validated) |
| Validation: orphans & circular references | `lib/tree/validate.ts`, `ValidationPanel.tsx` |

Extras: undo/redo (Ctrl+Z / Ctrl+Shift+Z), dark/light mode, localStorage persistence, loading skeleton,
empty state, keyboard shortcuts (`/` search, `Ctrl+D` duplicate, `Del` delete, `Esc` deselect),
phone-width layout (sidebar becomes a drawer).

## Architecture

```
app/                    routes: / (module hub) and /tree (this editor)
components/tree/        editor UI — Canvas, PolicyNode, TreeEdge, Palette, Inspector, Toolbar,
                        Header, ValidationPanel, JsonModal, EditorSkeleton
components/ui/          Modal, Button, ConfirmDialog
components/theme/       next-themes provider, toggle, toast host
lib/tree/               framework-free logic: store, graph helpers, validate, layout, serialize
data/                   mockTree.ts (sample policy), treeTemplates.ts (palette), sampleTrees.ts
hooks/                  useTreeActions (focus / add / layout helpers), useTreeShortcuts
types/tree.ts           all shared types
```

### State management
A single **Zustand store** (`lib/tree/store.ts`) owns `nodes` and `edges` — React Flow is run in
*controlled* mode, so every change flows through store actions. That gives one place to enforce the
tree rules:

- one Root only; a Root cannot have a parent; no self-links
- linking to a node that already has a parent **re-parents** it (old incoming edge is replaced)
- links that would create a cycle are refused, with a toast explaining why
- undo/redo snapshots; typing in the inspector and drags are coalesced into single steps

State is persisted with Zustand `persist` (`skipHydration`) and rehydrated after mount, so
server and first client render match; a skeleton shows until it loads.

### Validation
`validateTree` is a pure function. Orphans = non-root nodes with no parent. Cycles are found with an
iterative Tarjan SCC (no recursion limits). It runs even though the UI blocks cycles, because **imported
JSON can contain anything**. Results ring the offending nodes on the canvas and list in the sidebar;
clicking an issue zooms to the nodes.

### JSON formats
- **Graph (lossless)** — `{ version, name, direction, nodes[{id,type,position,data}], edges[{id,source,target}] }`.
  Keeps positions and can represent orphans/cycles.
- **Nested view** — readable hierarchy under the Root (`tree.children[]`). Importable; positions are recomputed.

Import accepts either shape, validates with zod, and reports specific errors (bad enum, duplicate ids,
edges pointing at unknown nodes). A file with no coordinates is auto-laid-out.

## Demo script (mirrors the review Q&A)

1. **Open `/tree`** — the sample Firm Compliance Policy loads. Toggle grid and mini-map; zoom/pan; *Reset view*.
2. **Drag a node and link it** — drag the **DISC-09 Fee Disclosure** template to empty canvas → the header
   shows an *orphan* error and the node is flagged. Drag from the Root's bottom handle to DISC-09's top handle →
   linked, validation turns green. (Alternatively drop a palette item *onto* a node to attach it as a child.)
3. **Re-parent** — drag from a different parent's **bottom** handle to a rule's **top** handle (its old parent link is replaced), or use the *Parent* dropdown in the inspector.
4. **Inspector** — click a node: edit label, rule ID, description, severity, status, parameters, tags; the card updates live.
5. **Search** — type `FINRA`; matches highlight, others dim; `Enter` cycles through matches.
6. **Auto-layout** — scatter some nodes, press *Auto-layout* (animated), flip to left→right.
7. **JSON** — *JSON* button → Graph and Nested tabs, Copy / Download.
8. **Validation** — *More (…) → Import JSON → "Broken sample"* → *Import*: one **orphan** and one **cycle** are reported;
   click each issue to jump to the nodes. Try linking a leaf back to its ancestor to see the cycle refusal.
9. Undo with `Ctrl+Z`; switch dark/light; reload to show persistence.

## Notes
- React Flow's small attribution link is left in place intentionally.
- No backend: everything is client-side state (localStorage).
