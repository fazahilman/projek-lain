import Anthropic from "@anthropic-ai/sdk";
import { bersihkan, cariPelanggaran } from "./penjaga";
import type { HasilTerjemahan } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

const SISTEM = `Kamu membantu investor baru di pasar modal Indonesia memahami satu laporan keuangan perusahaan Tbk yang baru saja mereka unggah. Pembaca kamu awam: mereka belum tentu tahu apa itu liabilitas, ekuitas, atau arus kas operasional.

Tugas kamu cuma satu: menerjemahkan isi laporan itu jadi penjelasan yang bisa dimengerti orang biasa.

CARA KERJA
1. Baca dokumen dan temukan lima pos kunci: pendapatan, laba bersih, total aset, total liabilitas, dan arus kas operasional. Ambil angka periode terkini yang tersedia di dokumen.
2. Salin angkanya apa adanya seperti tertulis di laporan (termasuk satuannya, misal "jutaan rupiah"). Jangan mengarang angka. Kalau satu pos benar-benar tidak ada di dokumen, tandai ditemukan=false dan katakan terus terang bahwa pos itu tidak ketemu — jangan menebak.
3. Simpulkan status kesehatan perusahaan berdasarkan angka-angka itu, lalu jelaskan alasannya, lalu tunjukkan titik yang perlu diwaspadai.

NADA DAN GAYA
- Bahasa Indonesia, gaya bicara ke teman yang awam. Kalimat pendek. Bukan gaya laporan formal.
- Setiap klaim harus dikaitkan ke angka konkret dari laporan ini. Jangan menulis generalisasi kosong seperti "kinerja cukup baik" tanpa angka pendukung.
- Kalau terpaksa memakai istilah akuntansi, jelaskan artinya dalam kalimat yang sama dengan bahasa sehari-hari.
- Jangan menakut-nakuti dan jangan terlalu meyakinkan. Tujuannya pembaca paham, bukan terdorong mengambil keputusan tertentu.
- Kalau angkanya ambigu atau dokumennya tidak lengkap, katakan apa adanya.

BATASAN YANG TIDAK BOLEH DILANGGAR
- Dilarang keras memberi saran atau sinyal beli, tahan, atau jual dalam bentuk apa pun. Tidak boleh ada skor "layak beli", target harga, penilaian murah/mahal, kata "rekomendasi", "sebaiknya beli/jual", "undervalued", "prospek cuan", atau yang sejenis.
- Dilarang membandingkan dengan perusahaan lain atau dengan periode lain di luar yang tertulis di dokumen ini. Kalau dokumen memuat angka pembanding tahun sebelumnya, kamu boleh menyebutkannya sebagai isi dokumen, tapi jangan menariknya jadi tren atau proyeksi.
- Dilarang menyinggung harga saham, valuasi, atau kondisi pasar. Dokumen ini satu-satunya sumbermu.
- Status kesehatan adalah pembacaan kondisi keuangan di laporan, bukan penilaian layak-tidaknya sebuah investasi.

ISI TIAP BAGIAN
- status.label: pilih "sehat", "perlu hati-hati", "berisiko", atau "belum bisa dinilai" (kalau pos kuncinya terlalu banyak yang tidak ketemu).
- status.ringkasan: satu sampai dua kalimat bahasa awam.
- alasan: 3 sampai 5 poin. Tiap poin menjelaskan kenapa statusnya begitu, dikaitkan ke angka spesifik dari laporan.
- titikWaspada: 3 sampai 5 poin. Hal spesifik dari laporan ini yang layak diperhatikan lebih lanjut oleh investor baru — bukan risiko umum yang berlaku untuk semua perusahaan. Rumuskan sebagai "ini yang perlu kamu perhatikan dan cek lebih jauh", bukan sebagai peringatan untuk bertindak.`;

const posSchema = {
  type: "object",
  properties: {
    nilaiTampil: {
      type: "string",
      description:
        'Angka apa adanya seperti tertulis di laporan beserta satuannya, mis. "Rp 12.345.678 juta". Kalau tidak ketemu, isi "tidak ditemukan".',
    },
    nilaiNumerik: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description:
        "Nilai dalam rupiah penuh (sudah dikalikan satuannya), atau null kalau tidak bisa dipastikan.",
    },
    periode: {
      type: "string",
      description: 'Periode yang diacu angka ini, mis. "31 Desember 2024" atau "tidak jelas".',
    },
    ditemukan: { type: "boolean" },
    catatan: {
      type: "string",
      description:
        "Satu kalimat: dari bagian mana angka ini diambil, atau kenapa tidak ketemu.",
    },
  },
  required: ["nilaiTampil", "nilaiNumerik", "periode", "ditemukan", "catatan"],
  additionalProperties: false,
} as const;

const poinSchema = {
  type: "object",
  properties: {
    judul: { type: "string", description: "Ringkas, maksimal sekitar 10 kata." },
    penjelasan: {
      type: "string",
      description:
        "2-4 kalimat bahasa awam yang menyebut angka konkret dari laporan ini.",
    },
  },
  required: ["judul", "penjelasan"],
  additionalProperties: false,
} as const;

const SKEMA_HASIL = {
  type: "object",
  properties: {
    namaPerusahaan: {
      type: "string",
      description: 'Nama perusahaan sesuai dokumen, atau "tidak disebutkan".',
    },
    periodeLaporan: {
      type: "string",
      description: 'Periode laporan, mis. "Tahun buku 2024" atau "tidak disebutkan".',
    },
    satuanAngka: {
      type: "string",
      description:
        'Satuan penyajian angka di laporan, mis. "jutaan rupiah" atau "rupiah penuh".',
    },
    jenisDokumen: {
      type: "string",
      description:
        'Jenis dokumen yang terbaca, mis. "laporan keuangan tahunan auditan" atau "laporan keuangan interim".',
    },
    posKunci: {
      type: "object",
      properties: {
        pendapatan: posSchema,
        labaBersih: posSchema,
        totalAset: posSchema,
        totalLiabilitas: posSchema,
        arusKasOperasi: posSchema,
      },
      required: [
        "pendapatan",
        "labaBersih",
        "totalAset",
        "totalLiabilitas",
        "arusKasOperasi",
      ],
      additionalProperties: false,
    },
    status: {
      type: "object",
      properties: {
        label: {
          type: "string",
          enum: ["sehat", "perlu hati-hati", "berisiko", "belum bisa dinilai"],
        },
        ringkasan: { type: "string" },
      },
      required: ["label", "ringkasan"],
      additionalProperties: false,
    },
    alasan: { type: "array", items: poinSchema },
    titikWaspada: { type: "array", items: poinSchema },
  },
  required: [
    "namaPerusahaan",
    "periodeLaporan",
    "satuanAngka",
    "jenisDokumen",
    "posKunci",
    "status",
    "alasan",
    "titikWaspada",
  ],
  additionalProperties: false,
} as const;

function ambilTeks(pesan: Anthropic.Message): string {
  return pesan.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function uraikan(teks: string): HasilTerjemahan {
  const data = JSON.parse(teks) as HasilTerjemahan;
  if (!data?.status?.label || !Array.isArray(data.alasan)) {
    throw new Error("Struktur hasil dari model tidak sesuai yang diharapkan.");
  }
  return data;
}

export class KesalahanPenerjemah extends Error {}

export async function terjemahkanLaporan(
  dokumen: string,
  namaFile: string,
): Promise<HasilTerjemahan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new KesalahanPenerjemah(
      "ANTHROPIC_API_KEY belum diatur di server, jadi laporan belum bisa diterjemahkan.",
    );
  }

  const client = new Anthropic({ apiKey });

  const permintaan = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" as const },
    system: SISTEM,
    output_config: {
      format: {
        type: "json_schema" as const,
        schema: SKEMA_HASIL as unknown as Record<string, unknown>,
      },
    },
  };

  const pesan: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        `Berikut isi teks laporan keuangan dari berkas "${namaFile}". ` +
        `Teks ini hasil ekstraksi otomatis dari PDF, jadi tata letak tabelnya mungkin berantakan — ` +
        `baca dengan hati-hati sebelum mengambil angka.\n\n` +
        `<dokumen>\n${dokumen}\n</dokumen>\n\n` +
        `Terjemahkan isi laporan ini sesuai instruksi.`,
    },
  ];

  const jalankan = async (): Promise<{ hasil: HasilTerjemahan; teks: string }> => {
    const stream = client.messages.stream({ ...permintaan, messages: pesan });
    const balasan = await stream.finalMessage();
    if (balasan.stop_reason === "refusal") {
      throw new KesalahanPenerjemah(
        "Model menolak memproses dokumen ini. Coba pastikan berkas yang diunggah memang laporan keuangan.",
      );
    }
    const teks = ambilTeks(balasan);
    return { hasil: uraikan(teks), teks };
  };

  let { hasil, teks } = await jalankan();
  let pelanggaran = cariPelanggaran(hasil);

  if (pelanggaran.length > 0) {
    // Sekali koreksi: tunjukkan persis kalimat yang melanggar, minta ditulis ulang.
    pesan.push({ role: "assistant", content: teks });
    pesan.push({
      role: "user",
      content:
        `Hasil tadi memuat kalimat bergaya saran investasi, padahal itu tidak boleh ada. ` +
        `Bagian yang bermasalah:\n` +
        pelanggaran.map((p) => `- ${p.lokasi}: "${p.kutipan}"`).join("\n") +
        `\n\nTulis ulang seluruh hasilnya. Pertahankan angka dan temuan yang sama, ` +
        `tapi ganti kalimat-kalimat itu jadi penjelasan kondisi apa adanya tanpa ` +
        `mengarahkan pembaca untuk membeli, menahan, atau menjual apa pun.`,
    });
    ({ hasil } = await jalankan());
    pelanggaran = cariPelanggaran(hasil);
    if (pelanggaran.length > 0) {
      console.warn(
        "[penerjemah-laporan] Kalimat bergaya saran masih tersisa setelah koreksi, dibersihkan otomatis:",
        pelanggaran,
      );
      hasil = bersihkan(hasil);
    }
  }

  hasil.alasan = hasil.alasan.slice(0, 5);
  hasil.titikWaspada = hasil.titikWaspada.slice(0, 5);
  hasil.mesin = "ai";
  return hasil;
}
