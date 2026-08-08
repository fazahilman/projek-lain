import type { Laporan, RingkasanRiwayat } from "./types";

/**
 * Penyimpanan sederhana untuk riwayat laporan dan catatan pribadi.
 *
 * Kalau environment punya kredensial Redis REST (Vercel KV / Upstash), data
 * disimpan di sana. Kalau tidak, dipakai penyimpanan di memori proses supaya
 * aplikasi tetap bisa dijalankan lokal — tapi datanya hilang saat proses mati,
 * jadi jangan dipakai di produksi.
 */

const REST_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export const PENYIMPANAN_PERMANEN = Boolean(REST_URL && REST_TOKEN);

let sudahMemperingatkan = false;
function peringatkanSekali() {
  if (sudahMemperingatkan) return;
  sudahMemperingatkan = true;
  console.warn(
    "[penerjemah-laporan] KV_REST_API_URL/KV_REST_API_TOKEN belum diisi. " +
      "Riwayat dan catatan disimpan di memori proses saja dan akan hilang saat restart.",
  );
}

const memori = new Map<string, string>();

async function perintah(args: (string | number)[]): Promise<unknown> {
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Penyimpanan menolak permintaan (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(`Penyimpanan bermasalah: ${data.error}`);
  return data.result ?? null;
}

async function ambil(kunci: string): Promise<string | null> {
  if (!PENYIMPANAN_PERMANEN) {
    peringatkanSekali();
    return memori.get(kunci) ?? null;
  }
  const hasil = await perintah(["GET", kunci]);
  return typeof hasil === "string" ? hasil : null;
}

async function simpan(kunci: string, nilai: string): Promise<void> {
  if (!PENYIMPANAN_PERMANEN) {
    peringatkanSekali();
    memori.set(kunci, nilai);
    return;
  }
  await perintah(["SET", kunci, nilai]);
}

const kunciLaporan = (id: string) => `pl:laporan:${id}`;
const kunciIndeks = (uid: string) => `pl:indeks:${uid}`;

const MAKS_RIWAYAT = 100;

export async function simpanLaporan(laporan: Laporan): Promise<void> {
  await simpan(kunciLaporan(laporan.id), JSON.stringify(laporan));

  const indeks = await ambilRiwayat(laporan.uid);
  const ringkasan: RingkasanRiwayat = {
    id: laporan.id,
    namaFile: laporan.namaFile,
    namaPerusahaan: laporan.hasil.namaPerusahaan,
    periodeLaporan: laporan.hasil.periodeLaporan,
    statusLabel: laporan.hasil.status.label,
    dibuatPada: laporan.dibuatPada,
  };
  const baru = [ringkasan, ...indeks.filter((r) => r.id !== laporan.id)].slice(
    0,
    MAKS_RIWAYAT,
  );
  await simpan(kunciIndeks(laporan.uid), JSON.stringify(baru));
}

export async function ambilLaporan(
  id: string,
  uid: string,
): Promise<Laporan | null> {
  const mentah = await ambil(kunciLaporan(id));
  if (!mentah) return null;
  const laporan = JSON.parse(mentah) as Laporan;
  // Riwayat bersifat per-pengguna: jangan bocorkan laporan milik orang lain.
  if (laporan.uid !== uid) return null;
  return laporan;
}

export async function ambilRiwayat(uid: string): Promise<RingkasanRiwayat[]> {
  const mentah = await ambil(kunciIndeks(uid));
  if (!mentah) return [];
  try {
    const data = JSON.parse(mentah);
    return Array.isArray(data) ? (data as RingkasanRiwayat[]) : [];
  } catch {
    return [];
  }
}

export async function simpanCatatan(
  id: string,
  uid: string,
  catatan: string,
): Promise<boolean> {
  const laporan = await ambilLaporan(id, uid);
  if (!laporan) return false;
  laporan.catatan = catatan;
  laporan.catatanDiperbaruiPada = new Date().toISOString();
  await simpan(kunciLaporan(id), JSON.stringify(laporan));
  return true;
}
