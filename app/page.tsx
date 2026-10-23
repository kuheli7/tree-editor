import { ArrowUpRight, FolderLock, MessageSquareText, ShieldCheck, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/cn";

type Module = {
  id: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
  href?: string;
  accent: string;
};

const modules: Module[] = [
  {
    id: "FE-1",
    title: "Virtual Data Room",
    blurb: "Secure document hierarchy, previews, permission tags and audit trails.",
    icon: FolderLock,
    accent: "var(--kind-rule)",
  },
  {
    id: "FE-2",
    title: "Compliance Chat & AI",
    blurb: "Streaming assistant with citations, attachments and thread history.",
    icon: MessageSquareText,
    accent: "var(--kind-condition)",
  },
  {
    id: "FE-3",
    title: "Enterprise Admin",
    blurb: "RBAC, rule policies, analytics, system health and feature flags.",
    icon: ShieldCheck,
    accent: "var(--kind-action)",
  },
  {
    id: "FE-4",
    title: "Policy Tree Editor",
    blurb: "Drag, connect and validate compliance rule hierarchies; import and export JSON.",
    icon: Workflow,
    href: "/tree",
    accent: "var(--kind-root)",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-ink">G</span>
          <span className="text-sm font-semibold tracking-tight text-ink">Glynac Platform</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="mt-14 sm:mt-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Wealth &amp; compliance workspace</p>
        <h1 className="mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          One workspace for documents, advice, administration and policy logic.
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base text-muted">
          Four frontend modules for compliance teams. The Policy Tree Editor is live; the others are queued.
        </p>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="Modules">
        {modules.map((m) => {
          const Icon = m.icon;
          const body = (
            <>
              <div className="flex items-start justify-between">
                <span
                  style={{ ["--c" as string]: m.accent }}
                  className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c)_15%,transparent)] text-[var(--c)]"
                >
                  <Icon className="size-5" strokeWidth={2.1} />
                </span>
                {m.href ? (
                  <ArrowUpRight className="size-5 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                ) : (
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">Coming soon</span>
                )}
              </div>
              <p className="mt-5 font-mono text-[11px] text-muted">{m.id}</p>
              <h2 className="mt-0.5 text-lg font-semibold text-ink">{m.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{m.blurb}</p>
            </>
          );

          const base = "group rounded-2xl border border-line bg-surface p-5 transition";
          return m.href ? (
            <Link
              key={m.id}
              href={m.href}
              className={cn(base, "shadow-card hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-pop")}
            >
              {body}
            </Link>
          ) : (
            <div key={m.id} aria-disabled className={cn(base, "opacity-60")}>
              {body}
            </div>
          );
        })}
      </section>
    </div>
  );
}
