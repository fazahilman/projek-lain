/**
 * Laporan keuangan tahunan perusahaan Tbk sering ratusan halaman, sementara
 * pos-pos kunci hanya ada di beberapa halaman laporan utama. Modul ini memilih
 * halaman yang paling mungkin memuat angka-angka itu supaya yang dikirim ke
 * model tetap masuk akal ukurannya tanpa kehilangan bagian pentingnya.
 */

const KATA_KUNCI: { pola: RegExp; bobot: number }[] = [
  { pola: /laporan posisi keuangan|balance sheet|neraca/i, bobot: 40 },
  { pola: /laporan laba rugi|profit or loss|income statement/i, bobot: 40 },
  { pola: /laporan arus kas|statements? of cash flows?/i, bobot: 40 },
  { pola: /penghasilan komprehensif|comprehensive income/i, bobot: 20 },
  { pola: /ikhtisar (data )?keuangan|financial highlights/i, bobot: 25 },
  { pola: /jumlah aset|total aset|total assets/i, bobot: 30 },
  { pola: /jumlah liabilitas|total liabilitas|total liabilities/i, bobot: 30 },
  { pola: /jumlah ekuitas|total ekuitas|total equity/i, bobot: 20 },
  { pola: /aktivitas operasi|operating activities/i, bobot: 30 },
  { pola: /kas neto|net cash/i, bobot: 20 },
  { pola: /laba (tahun|periode) berjalan|laba bersih|profit for the (year|period)/i, bobot: 30 },
  { pola: /pendapatan (neto|bersih|usaha)?|penjualan neto|revenue|net sales/i, bobot: 20 },
  { pola: /beban pokok penjualan|cost of (goods sold|revenue)/i, bobot: 15 },
  { pola: /laba per saham|earnings per share/i, bobot: 15 },
  { pola: /opini|wajar tanpa pengecualian|independent auditor/i, bobot: 15 },
  { pola: /kelangsungan usaha|going concern/i, bobot: 20 },
  { pola: /aset lancar|current assets/i, bobot: 15 },
  { pola: /liabilitas jangka pendek|current liabilities/i, bobot: 15 },
];

/** Perkiraan kepadatan angka di satu halaman — tabel keuangan pasti padat angka. */
function skorAngka(teks: string): number {
  const angka = teks.match(/[\d][\d.,]{3,}/g);
  if (!angka) return 0;
  return Math.min(angka.length / 4, 25);
}

export function skorHalaman(teks: string): number {
  let skor = skorAngka(teks);
  for (const { pola, bobot } of KATA_KUNCI) {
    if (pola.test(teks)) skor += bobot;
  }
  return skor;
}

export type HalamanTerpilih = {
  nomor: number; // 1-indexed
  teks: string;
};

export type HasilSeleksi = {
  halaman: HalamanTerpilih[];
  totalHalaman: number;
  dipangkas: boolean;
};

const BUDGET_KARAKTER = 140_000;
const HALAMAN_AWAL_SELALU_IKUT = 3;

/**
 * Ambil halaman-halaman paling relevan sampai mentok anggaran karakter, lalu
 * kembalikan dalam urutan aslinya supaya konteks dokumen tidak berantakan.
 */
export function pilihHalaman(
  halaman: string[],
  budget = BUDGET_KARAKTER,
): HasilSeleksi {
  const bersih = halaman.map((h) => h.replace(/[ \t]+/g, " ").trim());
  const total = bersih.length;

  const totalKarakter = bersih.reduce((a, b) => a + b.length, 0);
  if (totalKarakter <= budget) {
    return {
      halaman: bersih
        .map((teks, i) => ({ nomor: i + 1, teks }))
        .filter((h) => h.teks.length > 0),
      totalHalaman: total,
      dipangkas: false,
    };
  }

  const terpilih = new Set<number>();
  let terpakai = 0;

  const coba = (indeks: number) => {
    if (terpilih.has(indeks)) return;
    const panjang = bersih[indeks].length;
    if (panjang === 0) return;
    if (terpakai + panjang > budget) return;
    terpilih.add(indeks);
    terpakai += panjang;
  };

  for (let i = 0; i < Math.min(HALAMAN_AWAL_SELALU_IKUT, total); i++) coba(i);

  const berperingkat = bersih
    .map((teks, i) => ({ i, skor: skorHalaman(teks) }))
    .sort((a, b) => b.skor - a.skor);

  for (const { i, skor } of berperingkat) {
    if (skor <= 0) break;
    coba(i);
  }

  return {
    halaman: [...terpilih]
      .sort((a, b) => a - b)
      .map((i) => ({ nomor: i + 1, teks: bersih[i] })),
    totalHalaman: total,
    dipangkas: true,
  };
}

export function rakitDokumen(seleksi: HasilSeleksi): string {
  const bagian = seleksi.halaman.map(
    (h) => `<halaman nomor="${h.nomor}">\n${h.teks}\n</halaman>`,
  );
  const catatan = seleksi.dipangkas
    ? `<catatan>Dokumen asli punya ${seleksi.totalHalaman} halaman. Hanya ${seleksi.halaman.length} halaman yang paling relevan yang disertakan di bawah ini.</catatan>\n`
    : "";
  return `${catatan}${bagian.join("\n\n")}`;
}
