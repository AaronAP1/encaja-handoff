import { HeaderSimple } from "./SiteHeader";

/** Placeholder hasta tener el texto legal revisado por un abogado (docs/05) */
export function PaginaLegalPendiente({ titulo }: { titulo: string }) {
  return (
    <>
      <HeaderSimple lema="Sin registrarte · Nadie te va a llamar" />
      <main className="mx-auto flex max-w-[800px] flex-col gap-4 px-4 py-14 sm:px-8">
        <h1 className="m-0 text-[clamp(30px,4vw,44px)] font-black tracking-display">{titulo}</h1>
        <p className="m-0 text-lg text-texto-2">[Texto legal pendiente de revisión con asesoría legal]</p>
      </main>
    </>
  );
}
