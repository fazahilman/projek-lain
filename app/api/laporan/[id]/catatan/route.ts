import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_UID } from "@/lib/pengguna";
import { simpanCatatan } from "@/lib/store";

export const runtime = "nodejs";

const MAKS_PANJANG = 20_000;

async function tangani(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const uid = request.cookies.get(COOKIE_UID)?.value;
  if (!uid) {
    return NextResponse.json(
      { pesan: "Sesi tidak dikenali. Muat ulang halamannya lalu coba lagi." },
      { status: 401 },
    );
  }

  let badan: { catatan?: unknown };
  try {
    badan = (await request.json()) as { catatan?: unknown };
  } catch {
    return NextResponse.json({ pesan: "Isi permintaan bukan JSON yang sah." }, { status: 400 });
  }

  if (typeof badan.catatan !== "string") {
    return NextResponse.json({ pesan: "Catatan harus berupa teks." }, { status: 400 });
  }
  if (badan.catatan.length > MAKS_PANJANG) {
    return NextResponse.json(
      { pesan: `Catatan terlalu panjang (maksimal ${MAKS_PANJANG} karakter).` },
      { status: 413 },
    );
  }

  try {
    const berhasil = await simpanCatatan(id, uid, badan.catatan);
    if (!berhasil) {
      return NextResponse.json({ pesan: "Laporan tidak ditemukan." }, { status: 404 });
    }
  } catch (galat) {
    console.error("[penerjemah-laporan] gagal menyimpan catatan:", galat);
    return NextResponse.json({ pesan: "Catatan gagal disimpan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, disimpanPada: new Date().toISOString() });
}

export const PUT = tangani;

// navigator.sendBeacon — dipakai untuk menyelamatkan ketikan terakhir saat
// halaman ditutup — hanya bisa mengirim POST, jadi keduanya diterima.
export const POST = tangani;
