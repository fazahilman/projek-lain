"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Keadaan = "diam" | "mengetik" | "menyimpan" | "tersimpan" | "gagal";

const JEDA_SIMPAN = 1200;

export default function CatatanPribadi({
  idLaporan,
  awal,
}: {
  idLaporan: string;
  awal: string;
}) {
  const [nilai, setNilai] = useState(awal);
  const [keadaan, setKeadaan] = useState<Keadaan>("diam");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Dua ref ini dibaca oleh handler "pagehide" yang hanya dipasang sekali.
  // Kalau memakai state langsung, handler-nya bisa memegang nilai lama dan
  // ketikan terakhir pengguna hilang saat halaman ditutup.
  const nilaiRef = useRef(awal);
  const terakhirDisimpanRef = useRef(awal);

  const simpan = useCallback(
    async (teks: string) => {
      setKeadaan("menyimpan");
      try {
        const res = await fetch(`/api/laporan/${idLaporan}/catatan`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catatan: teks }),
        });
        if (!res.ok) throw new Error(String(res.status));
        terakhirDisimpanRef.current = teks;
        setKeadaan("tersimpan");
      } catch {
        setKeadaan("gagal");
      }
    },
    [idLaporan],
  );

  function ubah(teks: string) {
    setNilai(teks);
    nilaiRef.current = teks;
    setKeadaan("mengetik");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void simpan(teks), JEDA_SIMPAN);
  }

  // Selamatkan ketikan yang belum sempat kena jeda simpan otomatis saat
  // pengguna menutup tab atau pindah halaman.
  useEffect(() => {
    function selamatkan() {
      const teks = nilaiRef.current;
      if (teks === terakhirDisimpanRef.current) return;
      // sendBeacon selalu memakai POST, jadi route-nya menerima PUT dan POST.
      const terkirim = navigator.sendBeacon?.(
        `/api/laporan/${idLaporan}/catatan`,
        new Blob([JSON.stringify({ catatan: teks })], { type: "application/json" }),
      );
      if (terkirim) terakhirDisimpanRef.current = teks;
    }
    function saatTersembunyi() {
      if (document.visibilityState === "hidden") selamatkan();
    }
    window.addEventListener("pagehide", selamatkan);
    document.addEventListener("visibilitychange", saatTersembunyi);
    return () => {
      window.removeEventListener("pagehide", selamatkan);
      document.removeEventListener("visibilitychange", saatTersembunyi);
    };
  }, [idLaporan]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const pesan: Record<Keadaan, string> = {
    diam: "",
    mengetik: "Perubahan belum disimpan",
    menyimpan: "Menyimpan…",
    tersimpan: "Tersimpan",
    gagal: "Gagal menyimpan. Coba klik Simpan sekarang.",
  };

  return (
    <div className="catatan">
      <p className="lembut" style={{ marginTop: 0 }}>
        Tulis pemahamanmu sendiri tentang laporan ini — apa yang kamu tangkap,
        apa yang masih bikin bingung, apa yang mau kamu cek lagi nanti. Catatan
        ini tersimpan bersama laporannya dan hanya kamu yang bisa membukanya.
      </p>
      <textarea
        value={nilai}
        onChange={(e) => ubah(e.target.value)}
        placeholder="Menurut saya…"
        aria-label="Catatan pribadi tentang laporan ini"
      />
      <div className="baris-catatan">
        <span className="lembut" role="status" aria-live="polite">
          {pesan[keadaan]}
        </span>
        {(keadaan === "gagal" || keadaan === "mengetik") && (
          <button
            className="tombol sekunder"
            style={{ padding: "5px 12px", fontSize: 14 }}
            onClick={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              void simpan(nilai);
            }}
          >
            Simpan sekarang
          </button>
        )}
      </div>
    </div>
  );
}
