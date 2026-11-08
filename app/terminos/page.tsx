import type { Metadata } from "next";
import { PaginaLegalPendiente } from "@/components/PaginaLegalPendiente";

export const metadata: Metadata = { title: "Términos", robots: { index: false } };

export default function PaginaTerminos() {
  return <PaginaLegalPendiente titulo="Términos" />;
}
