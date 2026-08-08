"use client";

/**
 * Ekstraksi teks PDF dijalankan di browser, bukan di server. Dua alasannya:
 * laporan keuangan Tbk sering jauh lebih besar dari batas ukuran body permintaan
 * di Vercel, dan berkas PDF-nya sendiri jadi tidak perlu meninggalkan perangkat
 * pengguna — yang dikirim ke server hanya teksnya.
 */

/** Sebab kegagalan, dipakai halaman unggah untuk memilih kalimat yang tepat. */
export type SebabGagalPdf =
  | "terkunci" // butuh kata sandi
  | "rusak" // bukan PDF yang sah / berkasnya cacat
  | "kehabisan-memori" // umum di ponsel untuk berkas besar
  | "peramban" // peramban terlalu lama, API yang dibutuhkan tidak ada
  | "lainnya";

export class GagalBacaPdf extends Error {
  constructor(
    readonly sebab: SebabGagalPdf,
    readonly asal: unknown,
  ) {
    super(`Gagal membaca PDF (${sebab})`);
    this.name = "GagalBacaPdf";
  }
}

function kenaliSebab(e: unknown): SebabGagalPdf {
  const nama = (e as { name?: string })?.name ?? "";
  const pesan = String((e as { message?: string })?.message ?? e ?? "");

  if (nama === "PasswordException") return "terkunci";
  if (nama === "InvalidPDFException") return "rusak";
  if (nama === "RangeError" && /Array buffer allocation|Invalid (string|array) length/i.test(pesan))
    return "kehabisan-memori";
  if (/out of memory|allocation (size overflow|failed)/i.test(pesan)) return "kehabisan-memori";

  // Peramban lama: API yang dipakai pustaka PDF belum ada. Bentuknya selalu
  // TypeError "x is not a function" atau ReferenceError "x is not defined".
  if (
    (nama === "TypeError" || nama === "ReferenceError") &&
    /\b(withResolvers|hasOwn|structuredClone|at|findLast|replaceAll|Worker)\b/.test(pesan)
  )
    return "peramban";

  return "lainnya";
}

export async function bacaHalamanPdf(
  berkas: File,
  onKemajuan?: (halaman: number, total: number) => void,
): Promise<string[]> {
  // Sengaja memakai build "legacy". Isinya sama, bedanya sudah disertai polyfill
  // core-js — di pustaka utamanya maupun di worker-nya. Build biasa memakai
  // Promise.withResolvers, yang baru ada di Safari/iOS 17.4, jadi di iPhone yang
  // sedikit lebih lama membuka PDF apa pun akan gagal.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  let dokumen;
  try {
    const data = new Uint8Array(await berkas.arrayBuffer());
    dokumen = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  } catch (e) {
    throw new GagalBacaPdf(kenaliSebab(e), e);
  }

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
  } catch (e) {
    throw new GagalBacaPdf(kenaliSebab(e), e);
  } finally {
    await dokumen.destroy();
  }

  return halaman;
}
