import { Shirt } from "lucide-react";
import { cx } from "./ui";

export function FotoProduto({
  url,
  nome,
  className = "size-16",
}: {
  url: string | null | undefined;
  nome: string;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nome} loading="lazy" className={cx("shrink-0 rounded-tema bg-superficie-2 object-cover", className)} />;
  }
  return (
    <div className={cx("grid shrink-0 place-items-center rounded-tema bg-superficie-2 text-suave", className)} aria-hidden>
      <Shirt className="size-1/2" />
    </div>
  );
}
