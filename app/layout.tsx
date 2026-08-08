import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Penerjemah Laporan",
  description:
    "Unggah satu laporan keuangan perusahaan Tbk, dapatkan penjelasan sederhana tentang kondisi kesehatan perusahaannya beserta alasannya.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <div className="bungkus">
          <header className="kepala-situs">
            <Link href="/" className="merek">
              <h1>Penerjemah Laporan</h1>
            </Link>
            <p>
              Unggah satu laporan keuangan perusahaan Tbk, dapat penjelasan
              sederhana soal kondisi perusahaannya — beserta alasannya dan
              titik-titik yang perlu kamu perhatikan.
            </p>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
