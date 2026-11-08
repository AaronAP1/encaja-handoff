import type { Metadata, Viewport } from "next";
import { Overpass } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { MARCA } from "@/lib/marca";
import "./globals.css";

const overpass = Overpass({
  subsets: ["latin"],
  weight: ["300", "400", "600", "800", "900"],
  variable: "--font-overpass",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${MARCA.titulo} · El auto que te sirve`,
    template: `${MARCA.titulo} · %s`,
  },
  description:
    "Elige auto según cómo lo vas a usar: cuántos viajan, por dónde manejas y cuánto puedes pagar al mes. Sin registrarte y nadie te va a llamar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2A2D33",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PE" className={overpass.variable}>
      <body className="flex min-h-dvh flex-col bg-blanco font-sans text-asfalto antialiased">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
