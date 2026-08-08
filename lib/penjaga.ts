import type { HasilTerjemahan } from "./types";

/**
 * Batas yang disengaja: hasil terjemahan tidak boleh berisi saran beli, tahan,
 * atau jual dalam bentuk apa pun. Pola di bawah sengaja dibuat spesifik ke
 * kalimat bergaya rekomendasi — kata seperti "penjualan" atau "pembelian" yang
 * memang wajar muncul di laporan keuangan tidak ikut kena.
 */
const POLA_TERLARANG: RegExp[] = [
  /\bsebaiknya\s+(anda\s+)?(beli|membeli|jual|menjual|tahan|menahan|hindari|masuk|keluar)\b/i,
  /\b(disarankan|sarankan|menyarankan|rekomendasi|merekomendasikan|direkomendasikan)\b/i,
  /\blayak\s+(untuk\s+)?(di)?(beli|koleksi|investasi|dikoleksi|dibeli|hindari)\b/i,
  /\b(worth|not worth)\s+buying\b/i,
  /\b(buy|sell|hold)\s+(rating|recommendation|signal)\b/i,
  /\b(beli|jual|tahan)\s+sekarang\b/i,
  /\bjangan\s+(beli|membeli|jual|menjual)\b/i,
  /\b(target|harga wajar)\s+harga\b/i,
  /\bharga\s+(target|wajar)\b/i,
  /\b(undervalued|overvalued|multibagger|bargain)\b/i,
  /\b(cut\s?loss|take\s?profit|entry\s?(point|level)|akumulasi\s+saham|average\s?down)\b/i,
  /\bsaham(nya)?\s+(ini\s+)?(bagus|jelek|menarik|murah|mahal|prospektif)\b/i,
  /\b(prospek|potensi)\s+(cuan|untung|gain)\b/i,
  /\bpilihan\s+investasi\s+yang\b/i,
  /\b(cocok|tidak cocok)\s+(untuk\s+)?(di)?(beli|investasi|dikoleksi)\b/i,
];

export type Pelanggaran = {
  lokasi: string;
  kutipan: string;
};

function periksaTeks(lokasi: string, teks: string, keluar: Pelanggaran[]) {
  for (const pola of POLA_TERLARANG) {
    const cocok = teks.match(pola);
    if (cocok) keluar.push({ lokasi, kutipan: cocok[0] });
  }
}

export function cariPelanggaran(hasil: HasilTerjemahan): Pelanggaran[] {
  const keluar: Pelanggaran[] = [];
  periksaTeks("status.ringkasan", hasil.status.ringkasan, keluar);
  hasil.alasan.forEach((p, i) => {
    periksaTeks(`alasan[${i}].judul`, p.judul, keluar);
    periksaTeks(`alasan[${i}].penjelasan`, p.penjelasan, keluar);
  });
  hasil.titikWaspada.forEach((p, i) => {
    periksaTeks(`titikWaspada[${i}].judul`, p.judul, keluar);
    periksaTeks(`titikWaspada[${i}].penjelasan`, p.penjelasan, keluar);
  });
  return keluar;
}

function adaPelanggaran(teks: string): boolean {
  return POLA_TERLARANG.some((p) => p.test(teks));
}

/** Buang kalimat yang berbentuk saran, sisakan sisanya utuh. */
function saringKalimat(teks: string): string {
  const kalimat = teks.split(/(?<=[.!?])\s+/);
  const aman = kalimat.filter((k) => !adaPelanggaran(k));
  return aman.join(" ").trim();
}

/**
 * Jaring pengaman terakhir kalau model tetap menyisipkan kalimat bergaya saran
 * setelah diberi koreksi: kalimatnya dibuang, poin yang jadi kosong dihapus.
 */
export function bersihkan(hasil: HasilTerjemahan): HasilTerjemahan {
  const bersihPoin = (poin: { judul: string; penjelasan: string }[]) =>
    poin
      .map((p) => ({
        judul: adaPelanggaran(p.judul) ? saringKalimat(p.judul) : p.judul,
        penjelasan: saringKalimat(p.penjelasan),
      }))
      .filter((p) => p.judul.trim().length > 0 && p.penjelasan.trim().length > 0);

  return {
    ...hasil,
    status: {
      ...hasil.status,
      ringkasan: saringKalimat(hasil.status.ringkasan),
    },
    alasan: bersihPoin(hasil.alasan),
    titikWaspada: bersihPoin(hasil.titikWaspada),
  };
}
