import type { Metadata } from "next";
import { TreeEditor } from "@/components/tree/TreeEditor";

export const metadata: Metadata = {
  title: "Policy Tree Editor · Glynac",
  description: "Visually build, connect, validate and export compliance policy trees.",
};

export default function TreePage() {
  return <TreeEditor />;
}
