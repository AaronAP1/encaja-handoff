import { ButtonLink } from "@/components/Button";
import { HeaderSimple } from "@/components/SiteHeader";

export default function NoEncontrado() {
  return (
    <>
      <HeaderSimple lema="Sin registrarte · Nadie te va a llamar" />
      <main className="mx-auto flex max-w-[1240px] flex-col items-start gap-4 px-4 py-16 sm:px-8">
        <h1 className="m-0 text-[clamp(30px,4vw,48px)] font-black tracking-display">Esta página no existe</h1>
        <p className="m-0 text-lg text-texto-2">Puede que el enlace esté incompleto.</p>
        <ButtonLink href="/">Ir al inicio</ButtonLink>
      </main>
    </>
  );
}
