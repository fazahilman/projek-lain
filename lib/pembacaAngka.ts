import { POS_KUNCI, type KunciPos } from "./types";

/**
 * Pembaca angka tanpa AI.
 *
 * Mencari pos-pos kunci di teks hasil ekstraksi PDF dengan mencocokkan label
 * baris laporan keuangan, lalu mengambil angka pertama sesudah label itu (kolom
 * periode terkini). Cara ini bekerja baik untuk laporan yang memakai penamaan
 * baku PSAK, dan sengaja memilih diam ("tidak ditemukan") daripada menebak
 * kalau labelnya tidak dikenali.
 */

/** Ubah "8.025.200" -> 8025200, "(128.640)" -> -128640, "1.234,56" -> 1234.56 */
export function uraikanAngka(mentah: string): number | null {
  let teks = mentah.trim();
  let negatif = false;

  if (/^\(.*\)$/.test(teks)) {
    negatif = true;
    teks = teks.slice(1, -1).trim();
  }
  if (teks.startsWith("-")) {
    negatif = true;
    teks = teks.slice(1).trim();
  }
  if (!/^[\d.,]+$/.test(teks)) return null;

  const posisiKoma = teks.lastIndexOf(",");
  if (posisiKoma >= 0) {
    const utuh = teks.slice(0, posisiKoma).replace(/\./g, "");
    const pecahan = teks.slice(posisiKoma + 1);
    if (!/^\d+$/.test(pecahan)) return null;
    teks = `${utuh}.${pecahan}`;
  } else {
    teks = teks.replace(/\./g, "");
  }

  const angka = Number(teks);
  if (!Number.isFinite(angka)) return null;
  return negatif ? -angka : angka;
}

/**
 * Token angka yang dianggap sah sebagai nilai pos laporan: harus berformat
 * ribuan bertitik (8.025.200) atau minimal empat digit. Ini menyaring nomor
 * referensi catatan seperti "2c,5" dan nomor halaman yang sering nyangkut di
 * baris yang sama.
 */
const POLA_NILAI =
  /(?<![\w.,])(\(\s*)?-?(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{4,}(?:,\d+)?)(\s*\))?(?![\w.])/g;

export function angkaPertamaDi(baris: string): number | null {
  POLA_NILAI.lastIndex = 0;
  let cocok: RegExpExecArray | null;
  while ((cocok = POLA_NILAI.exec(baris)) !== null) {
    const nilai = uraikanAngka(cocok[0]);
    if (nilai !== null) return nilai;
  }
  return null;
}

type Aturan = {
  /** Label baris yang dicari. Diuji terhadap bagian kiri baris. */
  label: RegExp;
  /** Kalau salah satu pola ini kena, baris itu dilewati. */
  kecuali?: RegExp;
  /** Makin besar makin diutamakan saat beberapa baris sama-sama cocok. */
  prioritas: number;
};

const ATURAN: Record<KunciPos, Aturan[]> = {
  pendapatan: [
    { label: /^(jumlah\s+)?pendapatan\s*(neto|bersih|-\s*neto)?\s*$/i, prioritas: 100 },
    { label: /^(jumlah\s+)?penjualan\s*(neto|bersih|-\s*neto)?\s*$/i, prioritas: 95 },
    { label: /^pendapatan\s+usaha/i, prioritas: 90 },
    { label: /^(jumlah\s+)?pendapatan\b/i, kecuali: /lain|bunga|komprehensif|ditangguhkan|sewa|dividen/i, prioritas: 70 },
    { label: /^(jumlah\s+)?penjualan\b/i, kecuali: /beban|biaya|aset|lain/i, prioritas: 65 },
    { label: /^revenue|^net sales\b/i, prioritas: 50 },
  ],
  labaBersih: [
    { label: /^laba\s*\(?\s*rugi\s*\)?\s*(tahun|periode)\s+berjalan/i, prioritas: 100 },
    { label: /^rugi\s*\(?\s*laba\s*\)?\s*(tahun|periode)\s+berjalan/i, prioritas: 100 },
    { label: /^(laba|rugi)\s+(tahun|periode)\s+berjalan/i, prioritas: 95 },
    { label: /^laba\s*\(?\s*rugi\s*\)?\s*(neto|bersih)/i, prioritas: 90 },
    { label: /^(laba|rugi)\s+(neto|bersih)/i, prioritas: 88 },
    { label: /^(profit|loss)\s+for\s+the\s+(year|period)/i, prioritas: 50 },
  ],
  totalAset: [
    { label: /^(jumlah|total)\s+aset\s*$/i, prioritas: 100 },
    { label: /^(jumlah|total)\s+aset\b/i, kecuali: /lancar|tidak\s+lancar|tetap|takberwujud|tak\s+berwujud|keuangan|pajak/i, prioritas: 90 },
    { label: /^total\s+assets\b/i, prioritas: 50 },
  ],
  totalLiabilitas: [
    { label: /^(jumlah|total)\s+liabilitas\s*$/i, prioritas: 100 },
    { label: /^(jumlah|total)\s+liabilitas\b/i, kecuali: /jangka|lancar|dan\s+ekuitas|pajak|imbalan/i, prioritas: 90 },
    { label: /^total\s+liabilities\b/i, kecuali: /and\s+equity|current/i, prioritas: 50 },
  ],
  arusKasOperasi: [
    { label: /^(arus\s+)?kas\s+(neto|bersih)\s+(yang\s+)?(diperoleh\s+dari|digunakan\s+untuk|dari)\s+(kegiatan|aktivitas)\s+operasi/i, prioritas: 100 },
    { label: /^(arus\s+)?kas\s+(neto|bersih)\s+(kegiatan|aktivitas)\s+operasi/i, prioritas: 95 },
    { label: /^(jumlah\s+)?arus\s+kas\s+(neto\s+)?dari\s+(kegiatan|aktivitas)\s+operasi/i, prioritas: 92 },
    { label: /^net\s+cash\s+(provided|used|flows?)/i, kecuali: /investing|financing/i, prioritas: 50 },
  ],
};

/** Pos pendukung: tidak wajib, tapi bikin alasan dan titik waspada lebih tajam. */
export const POS_PENDUKUNG = [
  "ekuitas",
  "asetLancar",
  "liabilitasJangkaPendek",
  "labaKotor",
  "bebanBunga",
  "kas",
] as const;
export type KunciPendukung = (typeof POS_PENDUKUNG)[number];

const ATURAN_PENDUKUNG: Record<KunciPendukung, Aturan[]> = {
  ekuitas: [
    { label: /^(jumlah|total)\s+ekuitas\s*$/i, prioritas: 100 },
    { label: /^(jumlah|total)\s+ekuitas\b/i, kecuali: /yang\s+dapat|non-?pengendali|induk/i, prioritas: 85 },
  ],
  asetLancar: [{ label: /^(jumlah|total)\s+aset\s+lancar/i, prioritas: 100 }],
  liabilitasJangkaPendek: [
    { label: /^(jumlah|total)\s+liabilitas\s+jangka\s+pendek/i, prioritas: 100 },
  ],
  labaKotor: [{ label: /^laba\s+(bruto|kotor)/i, prioritas: 100 }],
  bebanBunga: [
    { label: /^beban\s+(bunga|keuangan)/i, kecuali: /pendapatan/i, prioritas: 100 },
  ],
  kas: [
    { label: /^kas\s+dan\s+setara\s+kas\s*$/i, prioritas: 100 },
    { label: /^kas\s+dan\s+setara\s+kas\b/i, kecuali: /akhir|awal|kenaikan|penurunan|dampak/i, prioritas: 85 },
  ],
};

export type Temuan = {
  nilai: number;
  baris: string;
  halaman: number;
  prioritas: number;
};

/** Pisahkan label (bagian kiri, sebelum angka pertama) dari sisa baris. */
function labelDari(baris: string): string {
  POLA_NILAI.lastIndex = 0;
  const cocok = POLA_NILAI.exec(baris);
  const potong = cocok ? baris.slice(0, cocok.index) : baris;
  return potong
    .replace(/\.{2,}/g, " ")
    .replace(/[|:]/g, " ")
    // Buang kolom referensi catatan, mis. "JUMLAH ASET 2c,5  8.025.200"
    .replace(/\s+\d+[a-z]?(,\s*\d+[a-z]?)*\s*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cariDenganAturan(
  halaman: { nomor: number; teks: string }[],
  aturan: Aturan[],
): Temuan | null {
  let terbaik: Temuan | null = null;

  for (const { nomor, teks } of halaman) {
    for (const baris of teks.split("\n")) {
      const bersih = baris.trim();
      if (bersih.length === 0) continue;

      const nilai = angkaPertamaDi(bersih);
      if (nilai === null) continue;

      const label = labelDari(bersih);
      if (label.length === 0 || label.length > 80) continue;

      for (const { label: pola, kecuali, prioritas } of aturan) {
        if (!pola.test(label)) continue;
        if (kecuali?.test(label)) continue;
        if (!terbaik || prioritas > terbaik.prioritas) {
          terbaik = { nilai, baris: bersih, halaman: nomor, prioritas };
        }
        break;
      }
    }
  }

  return terbaik;
}

export type HasilPembacaan = {
  pos: Partial<Record<KunciPos, Temuan>>;
  pendukung: Partial<Record<KunciPendukung, Temuan>>;
  namaPerusahaan: string | null;
  periodeLaporan: string | null;
  satuanAngka: string | null;
  pengaliSatuan: number;
  jenisDokumen: string;
};

const BULAN =
  "januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember";

function bacaMeta(gabungan: string): Omit<HasilPembacaan, "pos" | "pendukung"> {
  const namaCocok =
    gabungan.match(/\bPT[\s.]+[A-Z][A-Za-z0-9'&.\- ]{2,60}?\s+Tbk\b/) ??
    gabungan.match(/\bPT[\s.]+[A-Z][A-Za-z0-9'&.\- ]{2,60}/);
  const nama = namaCocok?.[0].replace(/\s+/g, " ").trim() ?? null;

  const periodeCocok =
    gabungan.match(new RegExp(`\\b\\d{1,2}\\s+(${BULAN})\\s+(19|20)\\d{2}`, "i")) ??
    gabungan.match(/\btahun\s+(buku\s+)?(19|20)\d{2}/i);
  const periode = periodeCocok?.[0].trim() ?? null;

  let satuan: string | null = null;
  let pengali = 1;
  if (/dalam\s+jutaan\s+rupiah/i.test(gabungan)) {
    satuan = "jutaan rupiah";
    pengali = 1_000_000;
  } else if (/dalam\s+ribuan\s+rupiah/i.test(gabungan)) {
    satuan = "ribuan rupiah";
    pengali = 1_000;
  } else if (/dalam\s+miliar(an)?\s+rupiah/i.test(gabungan)) {
    satuan = "miliaran rupiah";
    pengali = 1_000_000_000;
  } else if (/rupiah\s+penuh|dalam\s+rupiah\b/i.test(gabungan)) {
    satuan = "rupiah penuh";
  }

  const jenis = /interim|tiga\s+bulan|enam\s+bulan|sembilan\s+bulan|triwulan/i.test(
    gabungan,
  )
    ? "laporan keuangan interim"
    : /auditor\s+independen|telah\s+diaudit|auditan/i.test(gabungan)
      ? "laporan keuangan auditan"
      : "laporan keuangan";

  return {
    namaPerusahaan: nama,
    periodeLaporan: periode,
    satuanAngka: satuan,
    pengaliSatuan: pengali,
    jenisDokumen: jenis,
  };
}

export function bacaLaporan(
  halaman: { nomor: number; teks: string }[],
): HasilPembacaan {
  const pos: Partial<Record<KunciPos, Temuan>> = {};
  for (const kunci of POS_KUNCI) {
    const temuan = cariDenganAturan(halaman, ATURAN[kunci]);
    if (temuan) pos[kunci] = temuan;
  }

  const pendukung: Partial<Record<KunciPendukung, Temuan>> = {};
  for (const kunci of POS_PENDUKUNG) {
    const temuan = cariDenganAturan(halaman, ATURAN_PENDUKUNG[kunci]);
    if (temuan) pendukung[kunci] = temuan;
  }

  // Metadata biasanya ada di halaman-halaman awal.
  const awal = halaman
    .slice(0, 6)
    .map((h) => h.teks)
    .join("\n");

  return { pos, pendukung, ...bacaMeta(awal) };
}
