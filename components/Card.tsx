import type { ComponentProps, ElementType } from "react";

type Props<T extends ElementType> = {
  as?: T;
  grande?: boolean;
} & Omit<ComponentProps<T>, "as">;

/** Tarjeta blanca con borde 2 px; sin sombras genéricas */
export function Card<T extends ElementType = "div">({ as, grande = false, className = "", ...props }: Props<T>) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      className={`border-2 border-borde bg-white ${grande ? "rounded-tarjeta-lg" : "rounded-tarjeta"} ${className}`}
      {...props}
    />
  );
}
