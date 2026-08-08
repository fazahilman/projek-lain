"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bacaHalamanPdf } from "@/lib/bacaPdf";

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

    let halaman: string[];
    try {
      setTahap({ jenis: "membaca", halaman: 0, total: 0 });
      halaman = await bacaHalamanPdf(berkas, (h, total) =>
        setTahap({ jenis: "membaca", halaman: h, total }),
      );
    } catch (e) {
      console.error(e);
      setTahap({ jenis: "diam" });
      setGalat(
        "PDF-nya tidak bisa dibuka. Kalau berkasnya terkunci dengan kata sandi atau rusak, coba unggah versi lain.",
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
        body: JSON.stringify({ namaFile: berkas.name, halaman }),
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
              ? `Membaca isi PDF… halaman ${tahap.halaman} dari ${tahap.total}`
              : "Membuka PDF…"}
          </span>
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

      {galat && <p className="galat">{galat}</p>}
    </div>
  );
}
