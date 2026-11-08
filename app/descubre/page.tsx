import type { Metadata } from "next";
import { HeaderSimple } from "@/components/SiteHeader";
import { Descubre } from "./Descubre";

export const metadata: Metadata = { title: "Descubre qué te gusta" };

export default function PaginaDescubre() {
  return (
    <>
      <HeaderSimple lema="Sin registrarte y nadie te va a llamar" />
      <Descubre />
    </>
  );
}
