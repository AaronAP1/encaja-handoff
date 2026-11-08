import Link from "next/link";
import contenido from "@/data/landing-contenido.json";
import { BuscadorModelo } from "@/components/BuscadorModelo";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { FotoModelo } from "@/components/CarSilhouette";
import { KmPost } from "@/components/KmPost";
import { SignalIcon } from "@/components/SignalIcon";
import { Logo } from "@/components/SiteHeader";
import { SplitCarHero } from "@/components/SplitCarHero";
import { TerrainProfile } from "@/components/TerrainProfile";
import { SITUACIONES } from "@/lib/situaciones";
import type { Nivel } from "@/lib/tipos";

const SWATCH: Record<string, string> = {
  "En la costa": "#D8AD6E",
  "En la subida": "#A9763F",
  "Sobre 3,000 m": "#F2F4F7",
  "Hacia la selva": "#2E7B47",
};

function IconoCorazon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

export default function Portada() {
  return (
    <main className="bg-white text-asfalto">
      {/* 1. Hero partido: único fondo azul grande de la web */}
      <section className="foco-claro relative flex flex-col overflow-hidden lg:min-h-[860px]">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2 bg-asfalto" />
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-azul" />

        <header className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-[18px] sm:px-10">
          <Logo tamano={30} claro />
          <nav aria-label="Principal" className="flex flex-wrap items-center gap-x-[22px] gap-y-1 text-base font-semibold">
            <a href="#como-funciona" className="flex min-h-11 items-center text-white no-underline hover:text-white hover:underline">
              Cómo funciona
            </a>
            <Link href="/como-evaluamos" className="flex min-h-11 items-center text-white no-underline hover:text-white hover:underline">
              Cómo evaluamos
            </Link>
            <ButtonLink href="/preguntas" variante="claro" tamano="md" className="!text-base">
              Empezar
            </ButtonLink>
          </nav>
        </header>

        <div className="relative flex flex-grow flex-col items-center justify-center gap-[22px] px-4 pb-11 pt-1 sm:px-6">
          <SplitCarHero />

          {/* Botones partidos como el titular: "Que te guste" a la izquierda, "Y que te sirva" a la derecha */}
          <div className="grid w-full max-w-[1200px] grid-cols-2">
            <div className="flex flex-col items-end gap-2.5 pr-3 text-right sm:pr-7">
              <ButtonLink href="/descubre" variante="contorno" tamano="xl" className="!px-4 !text-[15px] sm:!px-[30px] sm:!text-lg lg:!text-xl">
                <IconoCorazon size={22} className="hidden shrink-0 sm:block" />
                No sé qué comprar
              </ButtonLink>
              <span className="text-sm text-[#C9CCD2] sm:text-[15px]">Desliza autos y te armamos tu perfil</span>
            </div>
            <div className="flex flex-col items-start gap-2.5 pl-3 sm:pl-7">
              <ButtonLink href="/preguntas" variante="letrero" tamano="xl" className="!px-4 !text-[15px] sm:!px-[30px] sm:!text-lg lg:!text-xl">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="hidden shrink-0 sm:block"
                >
                  <path d="M12 3v18" />
                  <path d="M12 3l-5 5" />
                  <path d="M12 3l5 5" />
                </svg>
                Encuentra el que cumple las dos
              </ButtonLink>
              <span className="rounded-letrero bg-asfalto px-3.5 py-1.5 text-sm text-white sm:text-[15px]">
                1 minuto, sin registrarte y nadie te va a llamar
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Franja de entradas */}
      <section aria-label="Otras formas de empezar" className="border-b border-borde bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end gap-x-14 gap-y-[26px] px-4 py-[30px] sm:px-8">
          <BuscadorModelo variante="portada" />
          <div className="flex flex-[1_1_300px] flex-col gap-2.5">
            <span className="text-[19px] font-extrabold">
              ¿No sabes ni qué te gusta? <span className="font-normal text-texto-2">Desliza autos y descúbrelo.</span>
            </span>
            <Link
              href="/descubre"
              className="flex min-h-[54px] items-center gap-2.5 self-start rounded-letrero border-2 border-azul bg-white px-[22px] text-base font-extrabold text-azul-oscuro no-underline"
            >
              <IconoCorazon />
              No sé qué comprar
            </Link>
          </div>
          <div className="flex flex-[1_1_420px] flex-col gap-2.5">
            <span className="text-[19px] font-extrabold">O empieza por tu situación</span>
            <div className="flex flex-wrap gap-2">
              {SITUACIONES.map((s) => (
                <Link
                  key={s.slug}
                  href={`/situacion/${s.slug}`}
                  className="flex min-h-12 items-center rounded-letrero border-2 border-azul bg-white px-[18px] text-base font-semibold text-azul-oscuro no-underline"
                >
                  {s.nombre}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Dos carriles */}
      <section className="mx-auto flex max-w-[1200px] flex-col gap-[34px] px-4 pb-10 pt-16 sm:px-8 sm:pt-[100px]">
        <h2 className="m-0 max-w-[820px] text-[clamp(32px,4.6vw,58px)] font-black leading-none tracking-display">
          Otros te preguntan por el auto. Nosotros, por tu vida.
        </h2>
        <div className="flex flex-wrap gap-y-4">
          <Card className="flex flex-[1_1_360px] flex-col gap-4 px-8 py-[30px]">
            <span className="text-base font-semibold text-texto-2">Lo que suelen preguntarte</span>
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-[21px] text-texto-2">
              <li>¿SUV, crossover o sedán?</li>
              <li>¿Transmisión manual o automática?</li>
              <li>¿Cuántos litros de maletero?</li>
              <li>¿Qué equipamiento te interesa?</li>
            </ul>
          </Card>
          <div aria-hidden="true" className="hidden flex-[0_0_28px] justify-center md:flex">
            <div className="w-1 bg-[repeating-linear-gradient(to_bottom,#9AA0A9_0_22px,transparent_22px_40px)]" />
          </div>
          <Card className="flex flex-[1_1_360px] flex-col gap-4 px-8 py-[30px]">
            <span className="text-base font-semibold text-azul">Lo que te preguntamos nosotros</span>
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-[21px] font-semibold">
              <li>¿Cuántos viajan contigo normalmente?</li>
              <li>¿Subes a la sierra o entras a trocha?</li>
              <li>¿Cuántos kilómetros haces al mes?</li>
              <li>¿Manejas de noche o con lluvia en carretera?</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* 4. El camino, en tres kilómetros */}
      <section id="como-funciona" className="flex scroll-mt-4 flex-col gap-[30px] pb-10 pt-[60px]">
        <h2 className="mx-auto m-0 w-full max-w-[1200px] px-4 text-[clamp(30px,4vw,48px)] font-black tracking-display sm:px-8">
          El camino, en tres kilómetros
        </h2>
        <div aria-hidden="true" className="flex h-16 items-center bg-pista">
          <div className="h-[5px] w-full bg-[repeating-linear-gradient(to_right,#FFFFFF_0_40px,transparent_40px_72px)]" />
        </div>
        <ol className="mx-auto -mt-[86px] grid w-full max-w-[1200px] list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 px-4 sm:px-8">
          {contenido.pasos.map((p) => (
            <li key={p.n} className="flex flex-col gap-3.5">
              <KmPost n={p.n} />
              <span className="text-[23px] font-extrabold tracking-[-0.01em]">{p.titulo}</span>
              <span className="max-w-[34ch] text-[17px] leading-[1.55] text-texto-2">{p.texto}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. Ejemplo de resultado */}
      <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-4 py-[60px] sm:px-8">
        <div className="flex flex-[1_1_360px] flex-col gap-[18px]">
          <h2 className="m-0 text-[clamp(30px,4vw,48px)] font-black leading-none tracking-display">
            No te decimos “compra este”. Te decimos por qué te sirve, o no.
          </h2>
          <p className="m-0 max-w-[46ch] text-lg leading-[1.55] text-texto-2">
            Cada modelo se evalúa para tu uso con tres señales que reconoces de la pista. Siempre con el porqué en palabras simples.
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-x-[22px] gap-y-2.5 p-0">
            {contenido.leyendaVeredictos.map((l) => (
              <li key={l.nivel} className="flex items-center gap-2.5 text-[17px]">
                <SignalIcon nivel={l.nivel as Nivel} />
                <span>
                  <strong>{l.nivel}</strong> {l.significa}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Card as="article" className="flex flex-[1_1_440px] flex-col gap-[18px] p-[26px]">
          <div className="flex items-center gap-4">
            <FotoModelo tipo="SUV" className="h-[68px] w-[104px] shrink-0 rounded-letrero !p-1.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[23px] font-extrabold">Honda BR-V</span>
              <span className="text-[15px] text-texto-2">Para 7 pasajeros, ciudad y trocha ocasional</span>
            </div>
          </div>
          {contenido.ejemploResultado.map((e) => (
            <div key={e.uso} className="flex items-start gap-3.5">
              <SignalIcon nivel={e.nivel as Nivel} />
              <span className="text-base leading-normal">
                <strong>
                  {e.uso}: {e.nivel}.
                </strong>{" "}
                {e.texto}
              </span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-dashed border-borde pt-4">
            <span className="text-[15px] text-texto-2">Costo total estimado</span>
            <span className="text-[22px] font-extrabold">S/ [monto] al mes</span>
          </div>
        </Card>
      </section>

      {/* 6. De la costa a la sierra */}
      <section className="flex flex-col gap-2.5 pb-5 pt-[60px]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2.5 px-4 sm:px-8">
          <h2 className="m-0 text-[clamp(30px,4vw,48px)] font-black tracking-display">De la costa a la sierra, evaluado para Perú</h2>
          <p className="m-0 max-w-[60ch] text-lg text-texto-2">
            Un auto que va bien en Lima puede quedarse corto en la subida. Por eso evaluamos el camino completo.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <TerrainProfile />
        </div>
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 px-4 sm:px-8">
          {contenido.peru.map((t) => (
            <div key={t.donde} className="flex flex-col gap-1.5 border-t-[3px] border-asfalto pt-2.5">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-texto-2">
                <span
                  aria-hidden="true"
                  className="size-3.5 shrink-0 rounded-[3px] border border-asfalto"
                  style={{ background: SWATCH[t.donde] }}
                />
                {t.donde}
              </span>
              <span className="text-[21px] font-extrabold">{t.titulo}</span>
              <span className="text-base leading-[1.55] text-texto-2">{t.texto}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Independencia */}
      <section id="independencia" className="mt-20 border-y border-borde bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-8 px-4 py-[84px] sm:px-8">
          <div className="flex flex-[1_1_560px] flex-col gap-4">
            <h2 className="m-0 text-[clamp(32px,4.6vw,60px)] font-black leading-[0.98] tracking-display text-azul">
              Ninguna marca paga por aparecer. Ni por subir en el ranking.
            </h2>
            <p className="m-0 max-w-[58ch] text-lg leading-[1.55] text-texto-2">
              Nuestras evaluaciones siguen reglas públicas, basadas en fichas oficiales de los modelos vendidos en Perú. Si encuentras
              un dato incorrecto, lo corregimos.
            </p>
          </div>
          <ButtonLink href="/como-evaluamos" variante="secundario" className="!rounded-letrero !text-[17px]">
            Ver cómo evaluamos
          </ButtonLink>
        </div>
      </section>

      {/* 8. Cierre */}
      <section className="flex justify-center px-4 py-24 sm:px-8">
        <Card grande className="box-border flex w-full max-w-[980px] flex-col items-center gap-[18px] px-6 py-14 text-center sm:px-8">
          <h2 className="m-0 text-[clamp(36px,5.6vw,72px)] font-black leading-[0.95] tracking-display">¿Cuál te sirve a ti?</h2>
          <p className="m-0 text-[19px]">Siete preguntas sobre tu día a día. Sin registrarte.</p>
          <ButtonLink href="/preguntas" className="!min-h-[58px] !px-8 !text-[19px] !font-black">
            Empezar ahora
          </ButtonLink>
        </Card>
      </section>
    </main>
  );
}
