"use client";

export type Celula = string | number | null | undefined;

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** CSV no padrão do Excel brasileiro (separador ";" e vírgula decimal). */
export function exportarCSV(nome: string, colunas: string[], linhas: Celula[][]) {
  const esc = (v: Celula) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2, useGrouping: false }) : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texto = [colunas, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
  baixar(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }), nome.endsWith(".csv") ? nome : `${nome}.csv`);
}

export interface OpcoesPDF {
  nome: string;
  titulo: string;
  subtitulo?: string;
  resumo?: [string, string][];
  colunas: string[];
  linhas: Celula[][];
  /** índices das colunas numéricas (alinhadas à direita) */
  numericas?: number[];
  paisagem?: boolean;
}

/** PDF com cabeçalho da marca, resumo e tabela. Carrega o jsPDF só quando usado. */
export async function exportarPDF(o: OpcoesPDF) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: o.paisagem ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const preto: [number, number, number] = [17, 17, 17];
  const vermelho: [number, number, number] = [200, 16, 46];

  doc.setFillColor(...preto);
  doc.rect(0, 0, largura, 56, "F");
  doc.setFillColor(...vermelho);
  doc.rect(0, 56, largura, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INSISTA", 32, 36);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(o.titulo, largura - 32, 30, { align: "right" });
  if (o.subtitulo) doc.text(o.subtitulo, largura - 32, 44, { align: "right" });

  let y = 80;
  doc.setTextColor(17, 17, 17);
  if (o.resumo?.length) {
    doc.setFontSize(10);
    const col = (largura - 64) / Math.min(o.resumo.length, 4);
    o.resumo.forEach(([rotulo, valor], i) => {
      const x = 32 + (i % 4) * col;
      const yy = y + Math.floor(i / 4) * 38;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(85, 85, 85);
      doc.text(rotulo, x, yy);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(13);
      doc.text(valor, x, yy + 16);
      doc.setFontSize(10);
    });
    y += Math.ceil(o.resumo.length / 4) * 38 + 8;
  }

  const estilos: Record<number, { halign: "right" }> = {};
  (o.numericas ?? []).forEach((i) => (estilos[i] = { halign: "right" }));
  autoTable(doc, {
    startY: y,
    head: [o.colunas],
    body: o.linhas.map((l) => l.map((c) => (c === null || c === undefined ? "" : String(c)))),
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: preto, textColor: 255 },
    alternateRowStyles: { fillColor: [244, 244, 244] },
    columnStyles: estilos,
    margin: { left: 32, right: 32 },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 32, h - 16);
      doc.text(`Página ${doc.getNumberOfPages()}`, largura - 32, h - 16, { align: "right" });
    },
  });
  doc.save(o.nome.endsWith(".pdf") ? o.nome : `${o.nome}.pdf`);
}
