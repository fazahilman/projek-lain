export type Istilah = {
  /** Bentuk yang muncul di teks. Boleh lebih dari satu (sinonim/ejaan lain). */
  bentuk: string[];
  judul: string;
  penjelasan: string;
};

/**
 * Kamus istilah ringan. Dipakai untuk menyorot istilah akuntansi yang muncul di
 * hasil terjemahan supaya pengguna bisa lihat penjelasannya tanpa pindah halaman.
 * Bentuk yang lebih panjang harus tetap menang atas yang pendek — pencocokan
 * mengurutkan sendiri berdasarkan panjang, jadi urutan di sini bebas.
 */
export const KAMUS: Istilah[] = [
  {
    bentuk: ["arus kas operasional", "arus kas dari aktivitas operasi", "arus kas operasi"],
    judul: "Arus kas operasional",
    penjelasan:
      "Uang tunai yang benar-benar masuk dan keluar dari kegiatan utama perusahaan (jualan, bayar gaji, bayar pemasok). Bedanya dengan laba: laba bisa berisi penjualan yang uangnya belum diterima, sedangkan ini uang kas sungguhan.",
  },
  {
    bentuk: ["arus kas"],
    judul: "Arus kas",
    penjelasan:
      "Aliran uang tunai masuk dan keluar perusahaan dalam satu periode.",
  },
  {
    bentuk: ["laba bersih", "laba tahun berjalan", "rugi bersih"],
    judul: "Laba bersih",
    penjelasan:
      "Sisa uang yang jadi milik perusahaan setelah semua pendapatan dikurangi semua biaya, bunga, dan pajak. Kalau angkanya minus, namanya rugi bersih.",
  },
  {
    bentuk: ["laba kotor"],
    judul: "Laba kotor",
    penjelasan:
      "Pendapatan dikurangi biaya langsung untuk membuat atau membeli barang yang dijual. Belum dipotong gaji kantor, bunga, dan pajak.",
  },
  {
    bentuk: ["laba usaha", "laba operasi"],
    judul: "Laba usaha",
    penjelasan:
      "Laba dari kegiatan utama perusahaan saja, sebelum dipotong bunga utang dan pajak.",
  },
  {
    bentuk: ["laba per saham"],
    judul: "Laba per saham",
    penjelasan:
      "Laba bersih dibagi jumlah saham yang beredar — jatah laba untuk tiap satu lembar saham.",
  },
  {
    bentuk: ["pendapatan", "penjualan neto", "penjualan bersih"],
    judul: "Pendapatan",
    penjelasan:
      "Total nilai barang atau jasa yang berhasil dijual dalam satu periode, sebelum dikurangi biaya apa pun. Sering juga disebut penjualan atau omzet.",
  },
  {
    bentuk: ["total aset", "jumlah aset", "aset"],
    judul: "Aset",
    penjelasan:
      "Semua yang dimiliki perusahaan dan punya nilai: kas, barang dagangan, piutang, pabrik, mesin, tanah. Total aset = jumlah semuanya.",
  },
  {
    bentuk: ["aset lancar"],
    judul: "Aset lancar",
    penjelasan:
      "Aset yang bisa dicairkan jadi uang dalam waktu dekat (biasanya di bawah satu tahun): kas, piutang, persediaan barang.",
  },
  {
    bentuk: ["total liabilitas", "jumlah liabilitas", "liabilitas"],
    judul: "Liabilitas",
    penjelasan:
      "Semua kewajiban atau utang perusahaan ke pihak lain: utang bank, utang ke pemasok, utang pajak. Total liabilitas = jumlah semuanya.",
  },
  {
    bentuk: ["liabilitas jangka pendek", "utang jangka pendek"],
    judul: "Liabilitas jangka pendek",
    penjelasan:
      "Utang yang jatuh tempo dalam waktu dekat, biasanya kurang dari satu tahun.",
  },
  {
    bentuk: ["liabilitas jangka panjang", "utang jangka panjang"],
    judul: "Liabilitas jangka panjang",
    penjelasan:
      "Utang yang baru harus dilunasi lebih dari satu tahun ke depan.",
  },
  {
    bentuk: ["ekuitas", "modal sendiri"],
    judul: "Ekuitas",
    penjelasan:
      "Bagian aset yang benar-benar milik pemegang saham, yaitu total aset dikurangi total liabilitas. Kalau perusahaan dijual dan semua utang dilunasi, sisanya inilah.",
  },
  {
    bentuk: ["rasio lancar", "current ratio"],
    judul: "Rasio lancar",
    penjelasan:
      "Aset lancar dibagi liabilitas jangka pendek. Gambaran kasar apakah uang dan aset cepat cair perusahaan cukup untuk menutup utang yang segera jatuh tempo.",
  },
  {
    bentuk: ["rasio utang terhadap ekuitas", "rasio utang", "debt to equity"],
    judul: "Rasio utang terhadap ekuitas",
    penjelasan:
      "Total liabilitas dibagi ekuitas. Menunjukkan seberapa besar perusahaan bergantung pada utang dibanding modal pemiliknya.",
  },
  {
    bentuk: ["margin laba bersih", "marjin laba bersih", "margin"],
    judul: "Margin laba",
    penjelasan:
      "Berapa persen dari setiap rupiah pendapatan yang tersisa jadi laba. Makin besar, makin banyak yang tersisa dari tiap penjualan.",
  },
  {
    bentuk: ["kas dan setara kas", "setara kas"],
    judul: "Kas dan setara kas",
    penjelasan:
      "Uang tunai perusahaan plus simpanan yang sangat mudah dicairkan, seperti deposito jangka pendek.",
  },
  {
    bentuk: ["piutang usaha", "piutang"],
    judul: "Piutang",
    penjelasan:
      "Tagihan perusahaan ke pelanggan atas barang atau jasa yang sudah diserahkan tapi uangnya belum diterima.",
  },
  {
    bentuk: ["persediaan"],
    judul: "Persediaan",
    penjelasan:
      "Barang yang masih tersimpan dan belum terjual, termasuk bahan baku dan barang setengah jadi.",
  },
  {
    bentuk: ["beban pokok penjualan", "harga pokok penjualan"],
    judul: "Beban pokok penjualan",
    penjelasan:
      "Biaya langsung untuk mengadakan barang yang dijual, misalnya bahan baku dan ongkos produksi.",
  },
  {
    bentuk: ["beban bunga"],
    judul: "Beban bunga",
    penjelasan: "Biaya yang dibayar perusahaan atas utangnya ke bank atau pemberi pinjaman lain.",
  },
  {
    bentuk: ["penyusutan", "depresiasi"],
    judul: "Penyusutan",
    penjelasan:
      "Pencatatan berkurangnya nilai aset seperti mesin atau kendaraan seiring waktu. Ini biaya di atas kertas, bukan uang yang keluar tahun itu.",
  },
  {
    bentuk: ["amortisasi"],
    judul: "Amortisasi",
    penjelasan:
      "Sama seperti penyusutan, tapi untuk aset tak berwujud seperti lisensi atau perangkat lunak.",
  },
  {
    bentuk: ["likuiditas"],
    judul: "Likuiditas",
    penjelasan:
      "Kemampuan perusahaan menyediakan uang tunai untuk membayar kewajiban yang segera jatuh tempo.",
  },
  {
    bentuk: ["solvabilitas"],
    judul: "Solvabilitas",
    penjelasan:
      "Kemampuan perusahaan melunasi seluruh utangnya, termasuk yang jangka panjang.",
  },
  {
    bentuk: ["modal kerja"],
    judul: "Modal kerja",
    penjelasan:
      "Aset lancar dikurangi liabilitas jangka pendek — dana yang tersedia untuk memutar kegiatan sehari-hari.",
  },
  {
    bentuk: ["opini auditor", "opini wajar tanpa pengecualian", "opini audit"],
    judul: "Opini auditor",
    penjelasan:
      "Kesimpulan akuntan publik independen setelah memeriksa laporan. \"Wajar tanpa pengecualian\" berarti auditor tidak menemukan masalah berarti dalam penyajiannya.",
  },
  {
    bentuk: ["kelangsungan usaha", "going concern"],
    judul: "Kelangsungan usaha",
    penjelasan:
      "Asumsi bahwa perusahaan akan tetap beroperasi setidaknya setahun ke depan. Kalau auditor meragukan ini, itu catatan yang serius.",
  },
  {
    bentuk: ["laporan posisi keuangan", "neraca"],
    judul: "Laporan posisi keuangan",
    penjelasan:
      "Potret kondisi perusahaan pada satu tanggal tertentu: apa saja yang dimiliki (aset), berapa utangnya (liabilitas), dan sisanya milik pemegang saham (ekuitas).",
  },
  {
    bentuk: ["laporan laba rugi"],
    judul: "Laporan laba rugi",
    penjelasan:
      "Ringkasan pendapatan dan biaya selama satu periode, yang berujung pada laba atau rugi.",
  },
  {
    bentuk: ["entitas anak", "anak usaha"],
    judul: "Entitas anak",
    penjelasan:
      "Perusahaan lain yang dikendalikan oleh perusahaan ini. Angkanya biasanya ikut digabung dalam laporan konsolidasian.",
  },
  {
    bentuk: ["konsolidasian", "konsolidasi"],
    judul: "Konsolidasian",
    penjelasan:
      "Laporan yang menggabungkan angka induk perusahaan dengan seluruh anak usahanya jadi satu.",
  },
];

/** Peta bentuk (huruf kecil) -> istilah, untuk lookup cepat. */
export const PETA_BENTUK: Record<string, Istilah> = (() => {
  const peta: Record<string, Istilah> = {};
  for (const istilah of KAMUS) {
    for (const bentuk of istilah.bentuk) peta[bentuk.toLowerCase()] = istilah;
  }
  return peta;
})();

const SEMUA_BENTUK = Object.keys(PETA_BENTUK).sort((a, b) => b.length - a.length);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Regex yang cocok dengan bentuk terpanjang lebih dulu, dan hanya kalau berdiri
 * sebagai kata utuh (bukan potongan kata lain).
 */
export const REGEX_ISTILAH = new RegExp(
  `(?<![\\p{L}\\p{N}])(${SEMUA_BENTUK.map(escapeRegex).join("|")})(?![\\p{L}\\p{N}])`,
  "giu",
);

export function cariIstilah(bentuk: string): Istilah | undefined {
  return PETA_BENTUK[bentuk.toLowerCase()];
}

/**
 * Kumpulkan istilah apa saja yang muncul di sekumpulan teks, untuk menyusun
 * kamus di bawah hasil. Sengaja ditaruh di sini (bukan di komponen) supaya bisa
 * dipanggil dari server component maupun dari browser.
 */
export function istilahYangMuncul(semuaTeks: string[]): Istilah[] {
  const ketemu = new Map<string, Istilah>();
  for (const teks of semuaTeks) {
    REGEX_ISTILAH.lastIndex = 0;
    let cocok: RegExpExecArray | null;
    while ((cocok = REGEX_ISTILAH.exec(teks)) !== null) {
      const istilah = cariIstilah(cocok[1]);
      if (istilah) ketemu.set(istilah.judul, istilah);
    }
  }
  return [...ketemu.values()].sort((a, b) => a.judul.localeCompare(b.judul, "id"));
}
