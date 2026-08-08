import { NextResponse, type NextRequest } from "next/server";

const COOKIE_UID = "pl_uid";
const UMUR_COOKIE = 60 * 60 * 24 * 365;

/**
 * Identitas pengguna paling sederhana yang cukup untuk v1: satu id acak di
 * cookie, dibuat otomatis saat kunjungan pertama. Tidak ada login.
 */
export function middleware(request: NextRequest) {
  const adaSebelumnya = request.cookies.get(COOKIE_UID)?.value;
  const response = NextResponse.next();

  if (!adaSebelumnya) {
    response.cookies.set({
      name: COOKIE_UID,
      value: crypto.randomUUID(),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: UMUR_COOKIE,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
