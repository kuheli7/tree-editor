"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";
import { useTreeShortcuts } from "@/hooks/useTreeShortcuts";
import { cn } from "@/lib/cn";
import { useTreeStore } from "@/lib/tree/store";
import { Canvas } from "./Canvas";
import { EditorSkeleton } from "./EditorSkeleton";
import { Header } from "./Header";
import { Inspector } from "./Inspector";
import { JsonModal } from "./JsonModal";
import { Palette } from "./Palette";
import { ValidationPanel } from "./ValidationPanel";
import { ValidationProvider } from "./ValidationContext";

type JsonState = { tab: "export" | "import" } | null;

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [json, setJson] = useState<JsonState>(null);
  const closeJson = useCallback(() => setJson(null), []);
  useTreeShortcuts();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app">
      <Header
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenJson={(tab) => setJson({ tab })}
        onValidate={() => setSidebarOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 z-20 bg-black/40 lg:hidden"
          />
        )}
        <aside
          className={cn(
            "thin-scroll absolute inset-y-0 left-0 z-30 w-[19rem] max-w-[86vw] shrink-0 space-y-6 overflow-y-auto border-r border-line bg-surface p-4 transition-transform duration-300 ease-[var(--ease-out-expo)]",
            "lg:static lg:z-auto lg:w-72 lg:max-w-none lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Palette />
          <ValidationPanel />
        </aside>

        <main className="relative flex min-w-0 flex-1 overflow-hidden">
          <Canvas onOpenJson={(tab) => setJson({ tab })} />
          <Inspector />
        </main>
      </div>

      {json && <JsonModal open initialTab={json.tab} onClose={closeJson} />}
    </div>
  );
}

export function TreeEditor() {
  const hydrated = useTreeStore((s) => s.hydrated);

  // The store skips auto-hydration so server and first client render match; load saved work now.
  useEffect(() => {
    void Promise.resolve(useTreeStore.persist.rehydrate()).then(() => useTreeStore.setState({ hydrated: true }));
  }, []);

  if (!hydrated) return <EditorSkeleton />;

  return (
    <ReactFlowProvider>
      <ValidationProvider>
        <Workspace />
      </ValidationProvider>
    </ReactFlowProvider>
  );
}
