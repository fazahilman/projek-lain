import Link from "next/link";
import FormUnggah from "@/components/FormUnggah";
import Lencana from "@/components/Lencana";
import { uidSaatIni } from "@/lib/pengguna";
import { ambilRiwayat } from "@/lib/store";
import { DISCLAIMER } from "@/lib/types";

export const dynamic = "force-dynamic";

function tanggalIndonesia(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function Beranda() {
  const uid = await uidSaatIni();
  const riwayat = uid ? await ambilRiwayat(uid) : [];

  return (
    <>
      <section className="bagian">
        <FormUnggah />
      </section>

      <section className="bagian">
        <h2>Riwayat laporan</h2>
        {riwayat.length === 0 ? (
          <p className="kosong">
            Belum ada laporan yang kamu unggah. Setelah ada, hasilnya muncul di
            sini dan bisa kamu buka lagi kapan saja.
          </p>
        ) : (
          <ul className="daftar-riwayat">
            {riwayat.map((r) => (
              <li key={r.id}>
                <Link href={`/laporan/${r.id}`}>
                  <div className="baris-riwayat">
                    <div>
                      <strong>{r.namaPerusahaan || r.namaFile}</strong>
                      <div className="lembut">
                        {r.periodeLaporan} · dibuka {tanggalIndonesia(r.dibuatPada)}
                      </div>
                    </div>
                    <Lencana label={r.statusLabel} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="penafian">{DISCLAIMER}</p>
    </>
  );
}
