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
    /** Ringkasan teknis, ditampilkan di balik "detail teknis" pada halaman. */
    readonly detail: string,
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

/**
 * Ringkasan kemampuan perangkat. Ikut ditampilkan waktu pembacaan gagal, supaya
 * laporan dari pengguna cukup satu tangkapan layar — tanpa ini kegagalan di
 * ponsel orang lain cuma bisa ditebak-tebak.
 */
export function jejakPerangkat(): string {
  const ada = (v: unknown) => (typeof v === "function" ? "ada" : "TIDAK");
  // Justru API yang belum tentu ada yang mau diperiksa, jadi diakses lewat
  // bentuk yang tidak menuntut tipenya sudah dikenal TypeScript.
  const bawaan = globalThis as unknown as Record<string, unknown>;
  return [
    navigator.userAgent,
    `withResolvers:${ada((Promise as unknown as Record<string, unknown>).withResolvers)}`,
    `hasOwn:${ada((Object as unknown as Record<string, unknown>).hasOwn)}`,
    `structuredClone:${ada(bawaan.structuredClone)}`,
    `Worker:${typeof Worker === "undefined" ? "TIDAK" : "ada"}`,
    `workerModul:${dukunganWorkerModul ?? "belum diuji"}`,
  ].join(" · ");
}

let dukunganWorkerModul: "ada" | "TIDAK" | null = null;

/**
 * pdfjs menjalankan worker-nya sebagai module worker (`new Worker(url, {type:
 * "module"})`). Safari baru mendukung itu sejak versi 15, dan kalau gagal,
 * gagalnya asinkron — pustaka bisa menunggu selamanya tanpa melempar apa pun.
 * Jadi kemampuannya diuji dulu dengan worker sungguhan yang sangat kecil.
 */
async function ujiWorkerModul(): Promise<boolean> {
  if (dukunganWorkerModul !== null) return dukunganWorkerModul === "ada";
  let hasil = false;
  if (typeof Worker !== "undefined") {
    const url = URL.createObjectURL(
      new Blob(["self.postMessage(1)"], { type: "text/javascript" }),
    );
    try {
      const w = new Worker(url, { type: "module" });
      hasil = await new Promise<boolean>((resolve) => {
        const selesai = (nilai: boolean) => {
          clearTimeout(jam);
          w.terminate();
          resolve(nilai);
        };
        const jam = setTimeout(() => selesai(false), 3000);
        w.onmessage = () => selesai(true);
        w.onerror = () => selesai(false);
      });
    } catch {
      hasil = false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  dukunganWorkerModul = hasil ? "ada" : "TIDAK";
  return hasil;
}

/**
 * Menyuruh pdfjs bekerja di thread utama. Ini pintu resmi yang disediakan
 * pustakanya: kalau `globalThis.pdfjsWorker` sudah terisi, pdfjs tidak membuat
 * Worker sama sekali dan memakai penangan itu langsung. Lebih lambat dan
 * menahan tampilan, tapi jalan di peramban yang worker modul-nya bermasalah.
 */
async function pakaiThreadUtama(): Promise<void> {
  const g = globalThis as { pdfjsWorker?: unknown };
  if (g.pdfjsWorker) return;
  g.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
}

/**
 * Longgar dengan sengaja. Laporan tahunan ratusan halaman di ponsel lama memang
 * bisa lama dibuka, dan batas yang ketat justru berbahaya: percobaan ulang lewat
 * thread utama membaca ulang seluruh berkas, jadi kalau sebab aslinya memori,
 * mempercepat mundur malah memperparah keadaan.
 */
const BATAS_BUKA_MS = 60_000;

function denganBatasWaktu<T>(janji: Promise<T>, ms: number): Promise<T | "kehabisan-waktu"> {
  return new Promise((resolve, reject) => {
    const jam = setTimeout(() => resolve("kehabisan-waktu"), ms);
    janji.then(
      (v) => {
        clearTimeout(jam);
        resolve(v);
      },
      (e) => {
        clearTimeout(jam);
        reject(e);
      },
    );
  });
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

  const adaWorker = await ujiWorkerModul();
  if (!adaWorker) await pakaiThreadUtama();

  // Byte-nya dibaca ulang tiap percobaan, bukan dipakai bersama. pdfjs
  // memindahkan (transfer) buffer ini ke worker, yang membuat Uint8Array di sini
  // ikut kosong — percobaan kedua dengan array yang sama akan terlihat seperti
  // berkas rusak, dan sebab aslinya tertutupi.
  const buka = async () =>
    await pdfjs.getDocument({
      data: new Uint8Array(await berkas.arrayBuffer()),
      useSystemFonts: true,
    }).promise;

  let dokumen;
  try {
    let hasil = await denganBatasWaktu(buka(), BATAS_BUKA_MS);
    if (hasil === "kehabisan-waktu") {
      // Worker terbentuk tapi tidak pernah menjawab — gejala khas module worker
      // yang gagal diam-diam. Sekali lagi lewat thread utama.
      await pakaiThreadUtama();
      hasil = await denganBatasWaktu(buka(), BATAS_BUKA_MS);
    }
    if (hasil === "kehabisan-waktu") {
      throw new GagalBacaPdf(
        "peramban",
        null,
        `kehabisan waktu 2x (${BATAS_BUKA_MS} ms) · ${jejakPerangkat()}`,
      );
    }
    dokumen = hasil;
  } catch (e) {
    if (e instanceof GagalBacaPdf) throw e;
    throw new GagalBacaPdf(kenaliSebab(e), e, `${ringkas(e)} · ${jejakPerangkat()}`);
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

      // Membersihkan tiap halaman saja tidak melepas simpanan font dan gambar
      // yang menumpuk di tingkat dokumen. Di ponsel, jatah memori satu tab jauh
      // lebih sempit daripada di komputer, dan laporan tahunan itu panjang —
      // jadi simpanan itu dikosongkan berkala, bukan cuma di akhir.
      if (i % 25 === 0) await dokumen.cleanup();

      onKemajuan?.(i, dokumen.numPages);
    }
  } catch (e) {
    throw new GagalBacaPdf(
      kenaliSebab(e),
      e,
      `halaman ${halaman.length + 1}/${dokumen.numPages} · ${ringkas(e)} · ${jejakPerangkat()}`,
    );
  } finally {
    await dokumen.destroy();
  }

  return halaman;
}

function ringkas(e: unknown): string {
  const nama = (e as { name?: string })?.name ?? typeof e;
  const pesan = String((e as { message?: string })?.message ?? e ?? "");
  return `${nama}: ${pesan.slice(0, 200)}`;
}
