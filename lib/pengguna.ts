import { cookies } from "next/headers";

export const COOKIE_UID = "pl_uid";
export const UMUR_COOKIE = 60 * 60 * 24 * 365; // 1 tahun

/**
 * Identitas pengguna paling sederhana yang cukup untuk v1: satu id acak yang
 * disimpan di cookie. Tidak ada login, tidak ada data pribadi — hanya penanda
 * supaya riwayat dan catatan seseorang tidak tercampur dengan orang lain.
 */
export async function uidSaatIni(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_UID)?.value ?? null;
}

export function buatUid(): string {
  return crypto.randomUUID();
}
