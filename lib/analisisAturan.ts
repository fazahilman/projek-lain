import {
  bacaLaporan,
  type HasilPembacaan,
  type KunciPendukung,
  type Temuan,
} from "./pembacaAngka";
import {
  LABEL_POS,
  POS_KUNCI,
  type HasilTerjemahan,
  type KunciPos,
  type Poin,
  type Pos,
  type StatusLabel,
} from "./types";

/**
 * Mesin baca tanpa AI.
 *
 * Semua kesimpulan di sini datang dari angka yang berhasil dibaca plus ambang
 * yang ditulis eksplisit di ATURAN_STATUS. Kalimatnya berpola tetap — yang
 * berubah antar-laporan adalah angka dan aturan mana yang kena. Ini memang
 * lebih kaku daripada penjelasan yang disusun model bahasa, dan halaman hasil
 * menyebutkan itu apa adanya supaya pembaca tahu sejauh apa yang ia baca.
 */

export const ATURAN_STATUS = {
  utangSangatTinggi: 0.8, // total liabilitas / total aset
  utangTinggi: 0.65,
  derTinggi: 2, // total liabilitas / ekuitas
  rasioLancarMinim: 1, // aset lancar / liabilitas jangka pendek
  marginTipis: 0.03, // laba bersih / pendapatan
  marginSehat: 0.1,
  minPosUntukMenilai: 3,
} as const;

const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function satuanRingkas(satuan: string | null): string {
  if (satuan === "jutaan rupiah") return " juta";
  if (satuan === "ribuan rupiah") return " ribu";
  if (satuan === "miliaran rupiah") return " miliar";
  return "";
}

function tulisAngka(nilai: number, satuan: string | null): string {
  const tanda = nilai < 0 ? "minus " : "";
  return `${tanda}Rp ${rupiah.format(Math.abs(nilai))}${satuanRingkas(satuan)}`;
}

function persen(rasio: number): string {
  return `${rupiah.format(Math.abs(rasio) * 100)} persen`;
}

function kali(rasio: number): string {
  return `${rupiah.format(rasio)} kali`;
}

type Berat = "berat" | "sedang" | "ringan";

type Sinyal = {
  berat: Berat;
  alasan: Poin;
  waspada?: Poin;
};

export function analisisTanpaAI(
  halaman: { nomor: number; teks: string }[],
): HasilTerjemahan {
  const baca = bacaLaporan(halaman);
  const { satuanAngka } = baca;

  const nilai = (kunci: KunciPos): number | null =>
    baca.pos[kunci]?.nilai ?? null;
  const bantu = (kunci: KunciPendukung): number | null =>
    baca.pendukung[kunci]?.nilai ?? null;

  const pendapatan = nilai("pendapatan");
  const labaBersih = nilai("labaBersih");
  const totalAset = nilai("totalAset");
  const totalLiabilitas = nilai("totalLiabilitas");
  const arusKas = nilai("arusKasOperasi");

  const ekuitas =
    bantu("ekuitas") ??
    (totalAset !== null && totalLiabilitas !== null
      ? totalAset - totalLiabilitas
      : null);
  const asetLancar = bantu("asetLancar");
  const liabilitasPendek = bantu("liabilitasJangkaPendek");
  const bebanBunga = bantu("bebanBunga");

  const posDitemukan = POS_KUNCI.filter((k) => baca.pos[k] !== undefined).length;
  const sinyal: Sinyal[] = [];
  const A = ATURAN_STATUS;

  // --- Untung atau rugi -------------------------------------------------
  if (labaBersih !== null) {
    const adaPendapatan = pendapatan !== null && pendapatan > 0;
    const marginRugi = adaPendapatan
      ? ` Kerugian itu setara ${persen(labaBersih / pendapatan!)} dari pendapatannya yang ${tulisAngka(pendapatan!, satuanAngka)}.`
      : "";
    const marginUntung = adaPendapatan
      ? ` Dari pendapatan ${tulisAngka(pendapatan!, satuanAngka)}, itu berarti ${persen(labaBersih / pendapatan!)} dari setiap rupiah yang masuk tersisa jadi keuntungan.`
      : "";

    if (labaBersih < 0) {
      sinyal.push({
        berat: "sedang",
        alasan: {
          judul: "Tahun ini perusahaan rugi",
          penjelasan:
            `Laba bersihnya ${tulisAngka(labaBersih, satuanAngka)} — angkanya minus, artinya seluruh biaya tahun itu lebih besar daripada seluruh pemasukannya.${marginRugi}`,
        },
        waspada: {
          judul: "Cari tahu penyebab ruginya di catatan laporan",
          penjelasan:
            `Rugi ${tulisAngka(Math.abs(labaBersih), satuanAngka)} bisa datang dari hal yang berulang tiap tahun (biaya operasional atau bunga utang) atau dari kejadian sekali saja (penurunan nilai aset, kerugian kurs). Bedanya besar untuk memahami kondisi perusahaan, dan penjelasannya ada di bagian catatan atas laporan keuangan.`,
        },
      });
    } else if (
      pendapatan !== null &&
      pendapatan > 0 &&
      labaBersih / pendapatan < A.marginTipis
    ) {
      sinyal.push({
        berat: "ringan",
        alasan: {
          judul: "Untung, tapi tipis",
          penjelasan:
            `Laba bersihnya ${tulisAngka(labaBersih, satuanAngka)} dari pendapatan ${tulisAngka(pendapatan, satuanAngka)} — hanya ${persen(labaBersih / pendapatan)}. Sisa yang jadi keuntungan kecil sekali dibanding uang yang berputar.`,
        },
        waspada: {
          judul: "Margin tipis bikin laba gampang goyah",
          penjelasan:
            `Dengan margin ${persen(labaBersih / pendapatan)}, kenaikan biaya sedikit saja sudah bisa membuat laba ${tulisAngka(labaBersih, satuanAngka)} ini berubah jadi rugi. Perhatikan komposisi bebannya di laporan laba rugi.`,
        },
      });
    } else {
      const sehatnya =
        pendapatan !== null && pendapatan > 0 && labaBersih / pendapatan >= A.marginSehat;
      sinyal.push({
        berat: "ringan",
        alasan: {
          judul: sehatnya ? "Perusahaan untung dengan margin lumayan" : "Perusahaan untung",
          penjelasan: `Laba bersihnya ${tulisAngka(labaBersih, satuanAngka)}.${marginUntung}`,
        },
      });
    }
  }

  // --- Uang kas dari kegiatan utama ------------------------------------
  if (arusKas !== null) {
    if (arusKas < 0) {
      sinyal.push({
        berat: "sedang",
        alasan: {
          judul: "Kegiatan utamanya menghabiskan kas, bukan menghasilkan",
          penjelasan:
            `Arus kas operasional ${tulisAngka(arusKas, satuanAngka)} — minus. Artinya sepanjang periode itu uang tunai yang keluar untuk menjalankan usaha lebih besar daripada yang masuk, jadi kekurangannya harus ditutup dari sumber lain seperti utang baru atau menjual aset.`,
        },
        waspada: {
          judul: "Cek dari mana kekurangan kasnya ditutup",
          penjelasan:
            `Karena operasi menyerap ${tulisAngka(arusKas, satuanAngka)}, lihat bagian arus kas pendanaan dan investasi di laporan yang sama untuk tahu apakah lubang itu ditambal dengan pinjaman baru, setoran pemilik, atau penjualan aset.`,
        },
      });
    } else if (labaBersih !== null && labaBersih < 0) {
      sinyal.push({
        berat: "ringan",
        alasan: {
          judul: "Meski rugi di atas kertas, kasnya masih masuk",
          penjelasan:
            `Laba bersihnya minus ${tulisAngka(Math.abs(labaBersih), satuanAngka)}, tapi arus kas operasional tetap positif ${tulisAngka(arusKas, satuanAngka)}. Ini bisa terjadi karena sebagian beban yang memotong laba tidak berupa uang keluar tahun itu, misalnya penyusutan nilai mesin dan bangunan.`,
        },
      });
    } else {
      sinyal.push({
        berat: "ringan",
        alasan: {
          judul: "Kegiatan utamanya menghasilkan uang tunai",
          penjelasan: `Arus kas operasional positif ${tulisAngka(arusKas, satuanAngka)}, jadi usaha intinya benar-benar mendatangkan kas, bukan cuma untung di pembukuan.`,
        },
      });
    }
  }

  // --- Utang dibanding harta dan modal ---------------------------------
  if (totalAset !== null && totalLiabilitas !== null && totalAset > 0) {
    const porsi = totalLiabilitas / totalAset;
    // Rasio utang-terhadap-ekuitas hanyalah cara lain menyatakan porsi yang sama
    // (utang > 2x ekuitas identik dengan utang > 67% aset), jadi ia ikut sebagai
    // penjelas di poin ini — bukan sinyal terpisah yang membuat satu kondisi
    // terhitung dua kali saat menentukan status.
    const der = ekuitas !== null && ekuitas > 0 ? totalLiabilitas / ekuitas : null;
    const bandingModal =
      der !== null && der > A.derTinggi
        ? ` Kalau dibandingkan modal pemiliknya sendiri, utang itu ${kali(der)} lipat — tiap Rp 1 modal ditemani sekitar Rp ${rupiah.format(der)} utang.`
        : "";

    const dasar =
      `Total liabilitas ${tulisAngka(totalLiabilitas, satuanAngka)} dibanding total aset ${tulisAngka(totalAset, satuanAngka)} — ${persen(porsi)} dari seluruh harta perusahaan dibiayai utang` +
      (ekuitas !== null ? `, sisanya ${tulisAngka(ekuitas, satuanAngka)} milik pemegang saham.` : ".") +
      bandingModal;

    if (ekuitas !== null && ekuitas <= 0) {
      sinyal.push({
        berat: "berat",
        alasan: {
          judul: "Utangnya melebihi seluruh hartanya",
          penjelasan: `${dasar} Karena liabilitas lebih besar dari aset, bagian milik pemegang saham habis dan jadi minus.`,
        },
        waspada: {
          judul: "Ekuitas minus perlu dibaca bersama catatan kelangsungan usaha",
          penjelasan:
            `Dengan ekuitas ${tulisAngka(ekuitas, satuanAngka)}, cek apakah auditor memberi catatan soal kelangsungan usaha dan bagaimana rencana manajemen memperbaikinya. Keduanya biasanya ada di halaman awal laporan.`,
        },
      });
    } else if (porsi > A.utangSangatTinggi) {
      sinyal.push({
        berat: "berat",
        alasan: {
          judul: "Hampir seluruh hartanya dibiayai utang",
          penjelasan: `${dasar} Porsi di atas ${persen(A.utangSangatTinggi)} berarti ruang perusahaan untuk menyerap kerugian sangat tipis.`,
        },
        waspada: {
          judul: "Lihat jadwal jatuh tempo utangnya",
          penjelasan:
            `Utang ${tulisAngka(totalLiabilitas, satuanAngka)} tidak jatuh tempo serentak. Catatan atas laporan keuangan merinci mana yang harus dibayar tahun depan dan mana yang masih lama — itu yang menentukan seberapa mendesak beban ini.`,
        },
      });
    } else if (porsi > A.utangTinggi) {
      sinyal.push({
        berat: "sedang",
        alasan: {
          judul: "Porsi utangnya cukup besar",
          penjelasan: `${dasar} Porsi di atas ${persen(A.utangTinggi)} tergolong tinggi.`,
        },
        waspada: {
          judul: "Lihat jadwal jatuh tempo utangnya",
          penjelasan:
            `Dari utang ${tulisAngka(totalLiabilitas, satuanAngka)}, cek di catatan berapa yang jatuh tempo dalam setahun ke depan dan berapa bunganya. Itu yang menentukan seberapa berat bebannya buat kas perusahaan.`,
        },
      });
    } else {
      sinyal.push({
        berat: "ringan",
        alasan: {
          judul: "Utangnya masih di bawah setengah hartanya",
          penjelasan: dasar,
        },
      });
    }

  }

  // --- Kemampuan bayar utang jangka pendek ------------------------------
  if (asetLancar !== null && liabilitasPendek !== null && liabilitasPendek > 0) {
    const rasio = asetLancar / liabilitasPendek;
    if (rasio < A.rasioLancarMinim) {
      sinyal.push({
        berat: "sedang",
        alasan: {
          judul: "Utang yang segera jatuh tempo melebihi aset yang cepat cair",
          penjelasan:
            `Aset lancar ${tulisAngka(asetLancar, satuanAngka)} berbanding liabilitas jangka pendek ${tulisAngka(liabilitasPendek, satuanAngka)}, atau ${kali(rasio)}. Di bawah 1 kali berarti kalau semua tagihan jangka pendek datang bersamaan, aset yang gampang dicairkan belum cukup menutupnya.`,
        },
        waspada: {
          judul: "Perhatikan komposisi aset lancarnya",
          penjelasan:
            `Dari aset lancar ${tulisAngka(asetLancar, satuanAngka)}, tidak semuanya sama cepat jadi uang. Kas paling cepat, piutang tergantung pelanggan membayar, persediaan harus laku dulu. Rinciannya ada di laporan posisi keuangan.`,
        },
      });
    }
  }

  // --- Beban bunga dibanding hasil usaha --------------------------------
  if (bebanBunga !== null && pendapatan !== null && pendapatan > 0) {
    const porsiBunga = Math.abs(bebanBunga) / pendapatan;
    if (porsiBunga > 0.05) {
      sinyal.push({
        berat: "ringan",
        alasan: {
          judul: "Bunga utang menyerap bagian yang lumayan dari pendapatan",
          penjelasan:
            `Beban bunga ${tulisAngka(Math.abs(bebanBunga), satuanAngka)} setara ${persen(porsiBunga)} dari pendapatan ${tulisAngka(pendapatan, satuanAngka)}. Ini biaya yang harus dibayar lebih dulu sebelum sisanya jadi keuntungan.`,
        },
      });
    }
  }

  // --- Tentukan status --------------------------------------------------
  const berat = sinyal.filter((s) => s.berat === "berat").length;
  const sedang = sinyal.filter((s) => s.berat === "sedang").length;

  let label: StatusLabel;
  if (posDitemukan < A.minPosUntukMenilai) {
    label = "belum bisa dinilai";
  } else if (berat >= 1 || sedang >= 3) {
    label = "berisiko";
  } else if (sedang >= 1) {
    label = "perlu hati-hati";
  } else {
    label = "sehat";
  }

  const ringkasan = susunRingkasan(label, {
    posDitemukan,
    labaBersih,
    arusKas,
    totalAset,
    totalLiabilitas,
    satuanAngka,
  });

  // Urutkan alasan: yang paling berat dulu, supaya poin terpenting di atas.
  const urutan: Record<Berat, number> = { berat: 0, sedang: 1, ringan: 2 };
  const terurut = [...sinyal].sort((a, b) => urutan[a.berat] - urutan[b.berat]);

  const alasan = terurut.map((s) => s.alasan).slice(0, 5);
  const titikWaspada = terurut
    .map((s) => s.waspada)
    .filter((w): w is Poin => w !== undefined);

  // Pos yang tidak terbaca adalah hal paling penting untuk diperiksa manual.
  const hilang = POS_KUNCI.filter((k) => baca.pos[k] === undefined);
  if (hilang.length > 0) {
    titikWaspada.unshift({
      judul: "Beberapa pos kunci tidak terbaca otomatis",
      penjelasan:
        `${hilang.map((k) => LABEL_POS[k].toLowerCase()).join(", ")} tidak ditemukan dengan penamaan baku di dokumen ini, jadi tidak ikut diperhitungkan. Cari sendiri angkanya di laporan aslinya sebelum menyimpulkan apa pun — kesimpulan di halaman ini disusun tanpa pos tersebut.`,
    });
  }

  if (baca.satuanAngka === null) {
    titikWaspada.push({
      judul: "Satuan angka tidak terdeteksi",
      penjelasan:
        "Dokumen ini tidak menyebutkan dengan jelas apakah angkanya disajikan dalam rupiah penuh, ribuan, atau jutaan. Angka di atas disalin apa adanya, jadi pastikan sendiri satuannya di kepala tabel laporan.",
    });
  }

  if (titikWaspada.length === 0) {
    titikWaspada.push({
      judul: "Tidak ada tanda mencolok dari lima pos kunci",
      penjelasan:
        "Aturan baku yang dipakai halaman ini tidak menemukan hal yang menonjol dari lima pos kunci tadi. Itu bukan berarti semuanya aman — aturan ini hanya melihat lima angka, sementara laporan lengkapnya memuat jauh lebih banyak hal.",
    });
  }

  return {
    mesin: "aturan",
    namaPerusahaan: baca.namaPerusahaan ?? "Nama perusahaan tidak terbaca",
    periodeLaporan: baca.periodeLaporan ?? "Periode tidak terbaca",
    satuanAngka: baca.satuanAngka ?? "tidak disebutkan",
    jenisDokumen: baca.jenisDokumen,
    posKunci: susunPos(baca),
    status: { label, ringkasan },
    alasan,
    titikWaspada: titikWaspada.slice(0, 5),
  };
}

function susunRingkasan(
  label: StatusLabel,
  d: {
    posDitemukan: number;
    labaBersih: number | null;
    arusKas: number | null;
    totalAset: number | null;
    totalLiabilitas: number | null;
    satuanAngka: string | null;
  },
): string {
  if (label === "belum bisa dinilai") {
    return `Hanya ${d.posDitemukan} dari 5 pos kunci yang berhasil dibaca otomatis dari dokumen ini, jadi belum cukup untuk menyimpulkan kondisinya. Coba buka laporan aslinya dan cari angka-angkanya langsung.`;
  }

  const bagian: string[] = [];
  if (d.labaBersih !== null) {
    bagian.push(
      d.labaBersih < 0
        ? `tahun ini rugi ${tulisAngka(Math.abs(d.labaBersih), d.satuanAngka)}`
        : `tahun ini untung ${tulisAngka(d.labaBersih, d.satuanAngka)}`,
    );
  }
  if (d.arusKas !== null) {
    bagian.push(
      d.arusKas < 0
        ? `kegiatan utamanya menyerap kas ${tulisAngka(Math.abs(d.arusKas), d.satuanAngka)}`
        : `kegiatan utamanya masih menghasilkan kas ${tulisAngka(d.arusKas, d.satuanAngka)}`,
    );
  }
  if (d.totalAset !== null && d.totalLiabilitas !== null && d.totalAset > 0) {
    bagian.push(
      `utangnya menutup ${persen(d.totalLiabilitas / d.totalAset)} dari seluruh hartanya`,
    );
  }

  const isi = bagian.join(", ");
  const pembuka: Record<Exclude<StatusLabel, "belum bisa dinilai">, string> = {
    sehat: "Dari lima pos kunci, kondisinya terbaca wajar",
    "perlu hati-hati": "Ada beberapa hal yang perlu kamu perhatikan",
    berisiko: "Ada tanda tekanan keuangan yang cukup jelas",
  };

  return `${pembuka[label as Exclude<StatusLabel, "belum bisa dinilai">]}. Ringkasan angkanya: ${isi}.`;
}

function susunPos(baca: HasilPembacaan): Record<KunciPos, Pos> {
  const keluar = {} as Record<KunciPos, Pos>;
  for (const kunci of POS_KUNCI) {
    const temuan: Temuan | undefined = baca.pos[kunci];
    if (!temuan) {
      keluar[kunci] = {
        nilaiTampil: "tidak ditemukan",
        nilaiNumerik: null,
        periode: "-",
        ditemukan: false,
        catatan:
          "Tidak ada baris dengan penamaan baku untuk pos ini di halaman yang terbaca.",
      };
      continue;
    }
    keluar[kunci] = {
      nilaiTampil: tulisAngka(temuan.nilai, baca.satuanAngka),
      nilaiNumerik: temuan.nilai * baca.pengaliSatuan,
      periode: baca.periodeLaporan ?? "periode tidak terbaca",
      ditemukan: true,
      catatan: `Diambil dari halaman ${temuan.halaman}, baris "${ringkas(temuan.baris)}".`,
    };
  }
  return keluar;
}

function ringkas(baris: string): string {
  const bersih = baris.replace(/\s+/g, " ").trim();
  return bersih.length > 90 ? `${bersih.slice(0, 88)}…` : bersih;
}
