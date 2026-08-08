import { NextResponse, type NextRequest } from "next/server";
import { KesalahanPenerjemah, terjemahkanLaporan } from "@/lib/penerjemah";
import { pilihHalaman, rakitDokumen } from "@/lib/seleksiHalaman";
import { simpanLaporan } from "@/lib/store";
import type { Laporan } from "@/lib/types";
import { COOKIE_UID, UMUR_COOKIE, buatUid } from "@/lib/pengguna";

export const runtime = "nodejs";
export const maxDuration = 300;

const MIN_KARAKTER = 400;

type Badan = {
  namaFile?: unknown;
  halaman?: unknown;
};

export async function POST(request: NextRequest) {
  let badan: Badan;
  try {
    badan = (await request.json()) as Badan;
  } catch {
    return NextResponse.json({ pesan: "Isi permintaan bukan JSON yang sah." }, { status: 400 });
  }

  const namaFile =
    typeof badan.namaFile === "string" && badan.namaFile.trim()
      ? badan.namaFile.trim().slice(0, 200)
      : "laporan.pdf";

  if (!Array.isArray(badan.halaman) || badan.halaman.some((h) => typeof h !== "string")) {
    return NextResponse.json(
      { pesan: "Isi halaman PDF tidak terbaca. Coba unggah ulang berkasnya." },
      { status: 400 },
    );
  }

  const halaman = badan.halaman as string[];
  const totalKarakter = halaman.reduce((a, b) => a + b.length, 0);

  if (totalKarakter < MIN_KARAKTER) {
    return NextResponse.json(
      {
        pesan:
          "Teks di dalam PDF ini hampir tidak terbaca. Kemungkinan berkasnya berupa hasil pindaian (gambar), " +
          "bukan PDF teks. Coba unggah versi PDF asli dari laporannya.",
      },
      { status: 422 },
    );
  }

  const seleksi = pilihHalaman(halaman);
  const dokumen = rakitDokumen(seleksi);

  let hasil;
  try {
    hasil = await terjemahkanLaporan(dokumen, namaFile);
  } catch (galat) {
    if (galat instanceof KesalahanPenerjemah) {
      return NextResponse.json({ pesan: galat.message }, { status: 502 });
    }
    console.error("[penerjemah-laporan] gagal menerjemahkan:", galat);
    return NextResponse.json(
      {
        pesan:
          "Gagal memproses laporan ini. Coba lagi sebentar; kalau tetap gagal, " +
          "kemungkinan dokumennya terlalu besar atau formatnya tidak biasa.",
      },
      { status: 502 },
    );
  }

  const uidLama = request.cookies.get(COOKIE_UID)?.value;
  const uid = uidLama ?? buatUid();

  const laporan: Laporan = {
    id: crypto.randomUUID(),
    uid,
    namaFile,
    jumlahHalaman: seleksi.totalHalaman,
    dibuatPada: new Date().toISOString(),
    hasil,
    catatan: "",
    catatanDiperbaruiPada: null,
  };

  try {
    await simpanLaporan(laporan);
  } catch (galat) {
    console.error("[penerjemah-laporan] gagal menyimpan laporan:", galat);
    return NextResponse.json(
      { pesan: "Hasilnya berhasil dibuat tapi gagal disimpan. Coba lagi." },
      { status: 500 },
    );
  }

  const respons = NextResponse.json({ id: laporan.id });
  if (!uidLama) {
    respons.cookies.set({
      name: COOKIE_UID,
      value: uid,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: UMUR_COOKIE,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return respons;
}
