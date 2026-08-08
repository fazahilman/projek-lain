import { ATURAN_STATUS } from "@/lib/analisisAturan";

const persen = (rasio: number) => `${Math.round(rasio * 100)}%`;

/**
 * Kalau hasilnya disusun aturan baku (tanpa AI), ambangnya ditunjukkan terbuka.
 * Pembaca berhak tahu status itu datang dari mana, apalagi karena aturannya
 * kaku dan cuma melihat lima angka.
 */
export default function CaraMenilai() {
  return (
    <details className="cara-menilai">
      <summary>Bagaimana status ini ditentukan?</summary>
      <p>
        Halaman ini disusun tanpa AI. Angkanya dibaca langsung dari dokumen
        dengan mencocokkan nama baris laporan keuangan, lalu status di atas
        ditentukan oleh ambang tetap berikut — sama untuk semua perusahaan:
      </p>
      <ul>
        <li>
          <strong>Berisiko</strong> kalau ada satu tanda berat: ekuitas minus,
          atau utang menutup lebih dari {persen(ATURAN_STATUS.utangSangatTinggi)}{" "}
          seluruh aset. Juga kalau ada tiga tanda sedang sekaligus.
        </li>
        <li>
          <strong>Perlu hati-hati</strong> kalau ada satu tanda sedang: rugi,
          arus kas operasional minus, utang di atas{" "}
          {persen(ATURAN_STATUS.utangTinggi)} dari aset, utang lebih dari{" "}
          {ATURAN_STATUS.derTinggi} kali modal sendiri, atau aset lancar lebih
          kecil dari utang jangka pendek.
        </li>
        <li>
          <strong>Sehat</strong> kalau tidak ada satu pun tanda di atas.
        </li>
        <li>
          <strong>Belum bisa dinilai</strong> kalau pos kunci yang terbaca kurang
          dari {ATURAN_STATUS.minPosUntukMenilai} dari 5.
        </li>
      </ul>
      <p className="lembut" style={{ marginBottom: 0 }}>
        Karena aturannya tetap, penjelasan di bawah berpola sama antar-laporan —
        yang berubah angkanya. Aturan ini juga hanya melihat lima pos kunci,
        sementara laporan lengkap memuat jauh lebih banyak hal yang tidak ikut
        terbaca.
      </p>
    </details>
  );
}
