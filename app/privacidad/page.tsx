import type { Metadata } from "next";
import { PaginaLegalPendiente } from "@/components/PaginaLegalPendiente";

export const metadata: Metadata = { title: "Privacidad", robots: { index: false } };

export default function PaginaPrivacidad() {
  return <PaginaLegalPendiente titulo="Privacidad" />;
}
