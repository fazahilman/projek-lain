export const POS_KUNCI = [
  "pendapatan",
  "labaBersih",
  "totalAset",
  "totalLiabilitas",
  "arusKasOperasi",
] as const;

export type KunciPos = (typeof POS_KUNCI)[number];

export const LABEL_POS: Record<KunciPos, string> = {
  pendapatan: "Pendapatan",
  labaBersih: "Laba bersih",
  totalAset: "Total aset",
  totalLiabilitas: "Total liabilitas",
  arusKasOperasi: "Arus kas operasional",
};

export type Pos = {
  /** Angka apa adanya seperti tertulis di laporan, mis. "Rp 12.345.678 juta". */
  nilaiTampil: string;
  /** Nilai numerik dalam satuan penuh (rupiah), null kalau tidak bisa dipastikan. */
  nilaiNumerik: number | null;
  /** Periode yang diacu angka itu, mis. "31 Desember 2024". */
  periode: string;
  /** false kalau pos ini tidak ketemu di dokumen. */
  ditemukan: boolean;
  /** Catatan singkat, mis. dari halaman/bagian mana angkanya diambil. */
  catatan: string;
};

export type StatusLabel =
  | "sehat"
  | "perlu hati-hati"
  | "berisiko"
  | "belum bisa dinilai";

export type Poin = {
  judul: string;
  penjelasan: string;
};

export type MesinBaca = "aturan" | "ai";

export type HasilTerjemahan = {
  /** Bagaimana hasil ini disusun: aturan baku tanpa AI, atau model Claude. */
  mesin: MesinBaca;
  namaPerusahaan: string;
  periodeLaporan: string;
  satuanAngka: string;
  jenisDokumen: string;
  posKunci: Record<KunciPos, Pos>;
  status: {
    label: StatusLabel;
    ringkasan: string;
  };
  alasan: Poin[];
  titikWaspada: Poin[];
};

export type RingkasanRiwayat = {
  id: string;
  namaFile: string;
  namaPerusahaan: string;
  periodeLaporan: string;
  statusLabel: StatusLabel;
  dibuatPada: string;
};

export type Laporan = {
  id: string;
  uid: string;
  namaFile: string;
  jumlahHalaman: number;
  dibuatPada: string;
  hasil: HasilTerjemahan;
  catatan: string;
  catatanDiperbaruiPada: string | null;
};

export const DISCLAIMER =
  "Halaman ini alat bantu untuk memahami isi laporan keuangan, bukan nasihat investasi. " +
  "Isinya dihasilkan otomatis dari dokumen yang kamu unggah dan bisa saja keliru membaca angka, " +
  "jadi selalu cek ulang ke laporan aslinya sebelum mengambil kesimpulan apa pun.";
