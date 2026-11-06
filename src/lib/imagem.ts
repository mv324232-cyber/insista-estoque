"use client";

/** Reduz a foto (celulares geram arquivos enormes) e converte para WebP/JPEG. */
export async function redimensionarImagem(arquivo: File, maximo = 900): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (blob && blob.type === "image/webp") return blob;
  return new Promise<Blob>((r, rej) => canvas.toBlob((b) => (b ? r(b) : rej(new Error("Falha ao converter imagem"))), "image/jpeg", 0.85));
}
