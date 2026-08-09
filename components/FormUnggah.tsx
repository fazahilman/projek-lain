"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bacaHalamanPdf,
  GagalBacaPdf,
  jejakPerangkat,
  type SebabGagalPdf,
} from "@/lib/bacaPdf";
import { skorHalaman } from "@/lib/seleksiHalaman";

const PESAN_GAGAL: Record<SebabGagalPdf, string> = {
  terkunci:
    "PDF ini terkunci kata sandi, jadi isinya tidak bisa dibaca. Coba unggah versi yang tidak terkunci.",
  rusak:
    "Berkas ini tidak terbaca sebagai PDF yang utuh. Kemungkinan unduhannya belum selesai atau berkasnya rusak — coba unduh ulang dari sumbernya.",
  "kehabisan-memori":
    "Perangkat kehabisan memori waktu membuka PDF sebesar ini. Di ponsel, coba tutup tab lain dulu, atau buka halaman ini dari komputer.",
  peramban:
    "Peramban di perangkat ini terlalu lama untuk membuka PDF. Coba perbarui sistemnya ke versi terbaru, atau buka halaman ini dari peramban lain.",
  lainnya:
    "PDF-nya gagal dibuka dan sebabnya tidak terbaca. Coba unggah ulang, atau pakai berkas versi lain.",
};

/**
 * Batas ukuran body permintaan di Vercel 4,5 MB. Laporan tahunan ratusan halaman
 * bisa melewatinya, dan kalau lewat, permintaannya ditolak sebelum sampai ke
 * kode kita — pengguna cuma melihat "gagal" tanpa sebab.
 */
const MAKS_KIRIM = 3_500_000;

/**
 * Membuang halaman yang paling tidak mungkin memuat angka laporan keuangan,
 * memakai penilai yang sama dengan yang dipakai server. Halaman yang dibuang
 * diganti teks kosong, bukan dihapus, supaya nomor halaman tetap cocok dengan
 * dokumen aslinya — hasil akhirnya menyebut "diambil dari halaman berapa".
 */
function rampingkan(halaman: string[]): string[] {
  const ukuran = (h: string[]) => h.reduce((a, b) => a + b.length, 0);
  if (ukuran(halaman) <= MAKS_KIRIM) return halaman;

  const urut = halaman
    .map((teks, i) => ({ i, teks, skor: skorHalaman(teks) }))
    .sort((a, b) => b.skor - a.skor);

  const disimpan = new Array<string>(halaman.length).fill("");
  let terpakai = 0;
  for (const { i, teks } of urut) {
    if (terpakai + teks.length > MAKS_KIRIM) continue;
    disimpan[i] = teks;
    terpakai += teks.length;
  }
  return disimpan;
}

type Tahap =
  | { jenis: "diam" }
  | { jenis: "membaca"; halaman: number; total: number }
  | { jenis: "menerjemahkan" };

const MAKS_UKURAN = 60 * 1024 * 1024; // 60 MB

export default function FormUnggah() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [tahap, setTahap] = useState<Tahap>({ jenis: "diam" });
  const [galat, setGalat] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [seret, setSeret] = useState(false);

  const sibuk = tahap.jenis !== "diam";

  function pilihBerkas(f: File | null | undefined) {
    setGalat(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setGalat("Berkasnya harus PDF.");
      return;
    }
    if (f.size > MAKS_UKURAN) {
      setGalat("Berkasnya terlalu besar (maksimal 60 MB).");
      return;
    }
    setBerkas(f);
  }

  async function kirim() {
    if (!berkas || sibuk) return;
    setGalat(null);
    setDetail(null);

    let halaman: string[];
    try {
      setTahap({ jenis: "membaca", halaman: 0, total: 0 });
      halaman = await bacaHalamanPdf(berkas, (h, total) =>
        setTahap({ jenis: "membaca", halaman: h, total }),
      );
    } catch (e) {
      console.error(e);
      setTahap({ jenis: "diam" });
      const sebab = e instanceof GagalBacaPdf ? e.sebab : "lainnya";
      setGalat(PESAN_GAGAL[sebab]);
      setDetail(
        e instanceof GagalBacaPdf
          ? e.detail
          : `${(e as Error)?.name}: ${(e as Error)?.message} · ${jejakPerangkat()}`,
      );
      return;
    }

    const jumlahKarakter = halaman.reduce((a, b) => a + b.length, 0);
    if (jumlahKarakter < 400) {
      setTahap({ jenis: "diam" });
      setGalat(
        "Hampir tidak ada teks yang bisa dibaca dari PDF ini. Kemungkinan ini hasil pindaian berupa gambar — coba unggah PDF asli dari laporannya.",
      );
      return;
    }

    setTahap({ jenis: "menerjemahkan" });
    try {
      const res = await fetch("/api/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaFile: berkas.name,
          halaman: rampingkan(halaman),
        }),
      });
      const data = (await res.json()) as { id?: string; pesan?: string };
      if (!res.ok || !data.id) {
        setTahap({ jenis: "diam" });
        setGalat(data.pesan ?? "Gagal memproses laporan. Coba lagi sebentar.");
        return;
      }
      router.push(`/laporan/${data.id}`);
    } catch (e) {
      console.error(e);
      setTahap({ jenis: "diam" });
      setGalat("Koneksi ke server terputus. Coba lagi.");
    }
  }

  return (
    <div
      className={`zona-unggah${seret ? " aktif" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!sibuk) setSeret(true);
      }}
      onDragLeave={() => setSeret(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSeret(false);
        if (!sibuk) pilihBerkas(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => pilihBerkas(e.target.files?.[0])}
      />

      {berkas ? (
        <>
          <p className="nama-berkas">{berkas.name}</p>
          <p className="lembut">{(berkas.size / 1024 / 1024).toFixed(1)} MB</p>
          <p style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="tombol" onClick={kirim} disabled={sibuk}>
              {sibuk ? "Sedang diproses…" : "Terjemahkan laporan ini"}
            </button>
            <button
              className="tombol sekunder"
              onClick={() => {
                setBerkas(null);
                setGalat(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={sibuk}
            >
              Ganti berkas
            </button>
          </p>
        </>
      ) : (
        <>
          <p>Tarik satu berkas PDF laporan keuangan ke sini</p>
          <p className="lembut" style={{ marginBottom: 18 }}>
            atau pilih dari perangkatmu
          </p>
          <button className="tombol" onClick={() => inputRef.current?.click()}>
            Pilih berkas PDF
          </button>
        </>
      )}

      {tahap.jenis === "membaca" && (
        <div className="status-proses">
          <span className="putar" aria-hidden />
          <span>
            {tahap.total > 0
              ? `Membaca halaman ${tahap.halaman} dari ${tahap.total}`
              : "Membuka berkasnya…"}
          </span>
          {tahap.total > 0 && (
            <>
              <div
                className="bilah"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={tahap.total}
                aria-valuenow={tahap.halaman}
                aria-label="Kemajuan membaca PDF"
              >
                <div
                  className="bilah-isi"
                  style={{ width: `${(tahap.halaman / tahap.total) * 100}%` }}
                />
              </div>
              {tahap.total > 100 && (
                <span className="lembut">
                  Laporannya panjang, jadi ini butuh waktu. Biarkan halaman ini
                  terbuka.
                </span>
              )}
            </>
          )}
        </div>
      )}

      {tahap.jenis === "menerjemahkan" && (
        <div className="status-proses">
          <span className="putar" aria-hidden />
          <span>
            Membaca angka-angkanya dan menyusun penjelasan. Ini bisa satu sampai
            dua menit — jangan tutup halamannya.
          </span>
        </div>
      )}

      {galat && (
        <div className="galat">
          <p style={{ margin: 0 }}>{galat}</p>
          {detail && (
            <details className="detail-galat">
              <summary>Detail teknis</summary>
              <p>
                Kalau mau melaporkan masalah ini, tangkapan layar bagian ini
                sudah cukup — isinya sebab sebenarnya dan kemampuan peramban di
                perangkat ini.
              </p>
              <code>{detail}</code>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
