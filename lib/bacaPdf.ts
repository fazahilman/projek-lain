"use client";

/**
 * Ekstraksi teks PDF dijalankan di browser, bukan di server. Dua alasannya:
 * laporan keuangan Tbk sering jauh lebih besar dari batas ukuran body permintaan
 * di Vercel, dan berkas PDF-nya sendiri jadi tidak perlu meninggalkan perangkat
 * pengguna — yang dikirim ke server hanya teksnya.
 */
export async function bacaHalamanPdf(
  berkas: File,
  onKemajuan?: (halaman: number, total: number) => void,
): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await berkas.arrayBuffer());
  const dokumen = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
  }).promise;

  const halaman: string[] = [];
  try {
    for (let i = 1; i <= dokumen.numPages; i++) {
      const laman = await dokumen.getPage(i);
      const isi = await laman.getTextContent();
      let teks = "";
      for (const item of isi.items) {
        if (!("str" in item)) continue;
        teks += item.str;
        teks += item.hasEOL ? "\n" : " ";
      }
      halaman.push(teks.replace(/\n{3,}/g, "\n\n").trim());
      laman.cleanup();
      onKemajuan?.(i, dokumen.numPages);
    }
  } finally {
    await dokumen.destroy();
  }

  return halaman;
}
