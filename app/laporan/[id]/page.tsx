import Link from "next/link";
import { notFound } from "next/navigation";
import CaraMenilai from "@/components/CaraMenilai";
import CatatanPribadi from "@/components/CatatanPribadi";
import Lencana from "@/components/Lencana";
import TeksBerkamus from "@/components/TeksBerkamus";
import { istilahYangMuncul } from "@/lib/glossary";
import { uidSaatIni } from "@/lib/pengguna";
import { ambilLaporan } from "@/lib/store";
import { DISCLAIMER, LABEL_POS, POS_KUNCI } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Jenis dokumen sudah berbunyi seperti kalimat ("laporan keuangan auditan"),
 * jadi tidak boleh diberi awalan "Laporan" lagi — cukup huruf depannya
 * dibesarkan supaya layak jadi awal baris.
 */
function awalHuruf(teks: string): string {
  return teks.charAt(0).toUpperCase() + teks.slice(1);
}

function tanggalIndonesia(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HalamanLaporan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uid = await uidSaatIni();
  const laporan = uid ? await ambilLaporan(id, uid) : null;
  if (!laporan) notFound();

  const { hasil } = laporan;

  const semuaTeks = [
    ...POS_KUNCI.map((k) => LABEL_POS[k]),
    hasil.status.ringkasan,
    ...hasil.alasan.flatMap((p) => [p.judul, p.penjelasan]),
    ...hasil.titikWaspada.flatMap((p) => [p.judul, p.penjelasan]),
  ];
  const istilah = istilahYangMuncul(semuaTeks);

  return (
    <>
      <Link href="/" className="tautan-balik">
        ← Kembali
      </Link>

      <header className="kepala-hasil">
        <Lencana label={hasil.status.label} />
        <h2>{hasil.namaPerusahaan}</h2>
        {/* Yang paling menentukan arti angkanya — jenis laporan dan periodenya
            — dipisah ke barisnya sendiri. Asal berkas dan tanggal buka cuma
            penanda arsip, jadi ditaruh di bawah dan dibuat lebih redup. */}
        <p style={{ margin: 0 }}>
          {awalHuruf(hasil.jenisDokumen)} per {hasil.periodeLaporan}
        </p>
        <p className="lembut" style={{ margin: "4px 0 0" }}>
          Dari berkas {laporan.namaFile} · {laporan.jumlahHalaman} halaman ·
          dibuka {tanggalIndonesia(laporan.dibuatPada)}
        </p>
        <p className="lembut" style={{ margin: "4px 0 0" }}>
          {hasil.mesin === "aturan"
            ? "Angkanya dibaca otomatis dengan aturan baku — tanpa AI."
            : "Dibaca dengan bantuan AI (model Claude)."}
        </p>
      </header>

      {/* 1. Status kesehatan */}
      <section className="bagian">
        <h2>Status kesehatan</h2>
        <div className="kartu">
          <p style={{ margin: 0, fontSize: 17 }}>
            <TeksBerkamus>{hasil.status.ringkasan}</TeksBerkamus>
          </p>
        </div>
        {hasil.mesin === "aturan" && <CaraMenilai />}
      </section>

      {/* Angka yang dibaca dari laporan */}
      <section className="bagian">
        <h2>Angka yang dibaca dari laporan</h2>
        <p className="lembut" style={{ marginTop: -6 }}>
          Lima angka ini yang jadi dasar semua penjelasan di halaman ini.
        </p>
        <div className="kartu pembungkus-tabel">
          <table className="tabel-pos">
            <tbody>
              {POS_KUNCI.map((kunci) => {
                const pos = hasil.posKunci[kunci];
                return (
                  <tr key={kunci}>
                    <th scope="row">
                      <TeksBerkamus>{LABEL_POS[kunci]}</TeksBerkamus>
                    </th>
                    <td>
                      {pos.ditemukan ? (
                        <>
                          <span>{pos.nilaiTampil}</span>
                          <span className="lembut">
                            {pos.periode}
                            {pos.catatan ? ` · ${pos.catatan}` : ""}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="pos-hilang">tidak ditemukan</span>
                          {pos.catatan && <span className="lembut">{pos.catatan}</span>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="lembut" style={{ marginBottom: 0, marginTop: 14 }}>
            Angka disalin apa adanya dari dokumen (satuan: {hasil.satuanAngka}).
            Kalau ada yang terlihat janggal, cek langsung ke halaman aslinya.
          </p>
        </div>
      </section>

      {/* 2. Alasan di balik status */}
      <section className="bagian">
        <h2>Alasan di balik status itu</h2>
        <ul className="daftar-poin">
          {hasil.alasan.map((poin, i) => (
            <li key={i}>
              <h3>
                <TeksBerkamus>{poin.judul}</TeksBerkamus>
              </h3>
              <p>
                <TeksBerkamus>{poin.penjelasan}</TeksBerkamus>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Titik yang perlu diwaspadai */}
      <section className="bagian">
        <h2>Titik yang perlu diwaspadai</h2>
        <ul className="daftar-poin waspada">
          {hasil.titikWaspada.map((poin, i) => (
            <li key={i}>
              <h3>
                <TeksBerkamus>{poin.judul}</TeksBerkamus>
              </h3>
              <p>
                <TeksBerkamus>{poin.penjelasan}</TeksBerkamus>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Kamus istilah ringan */}
      {istilah.length > 0 && (
        <section className="bagian">
          <div className="kartu kamus-penuh">
            <details>
              <summary>Kamus istilah yang muncul di halaman ini ({istilah.length})</summary>
              <p className="lembut" style={{ marginTop: 10, marginBottom: 0 }}>
                Istilah bergaris putus-putus di atas juga bisa langsung kamu klik
                untuk melihat penjelasannya.
              </p>
              <dl>
                {istilah.map((t) => (
                  <div key={t.judul}>
                    <dt>{t.judul}</dt>
                    <dd>{t.penjelasan}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        </section>
      )}

      {/* Catatan pribadi */}
      <section className="bagian">
        <h2>Catatan pribadi</h2>
        <div className="kartu">
          <CatatanPribadi idLaporan={laporan.id} awal={laporan.catatan} />
        </div>
      </section>

      <p className="penafian">{DISCLAIMER}</p>
    </>
  );
}
