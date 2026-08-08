"use client";

import { Fragment, useId, useState } from "react";
import { REGEX_ISTILAH, cariIstilah, type Istilah } from "@/lib/glossary";

type Potongan =
  | { jenis: "teks"; isi: string }
  | { jenis: "istilah"; isi: string; istilah: Istilah };

function potong(teks: string): Potongan[] {
  const hasil: Potongan[] = [];
  let posisi = 0;
  // Regex-nya global, jadi lastIndex harus direset tiap pemanggilan.
  REGEX_ISTILAH.lastIndex = 0;
  let cocok: RegExpExecArray | null;
  while ((cocok = REGEX_ISTILAH.exec(teks)) !== null) {
    const istilah = cariIstilah(cocok[1]);
    if (!istilah) continue;
    if (cocok.index > posisi) {
      hasil.push({ jenis: "teks", isi: teks.slice(posisi, cocok.index) });
    }
    hasil.push({ jenis: "istilah", isi: cocok[1], istilah });
    posisi = cocok.index + cocok[0].length;
  }
  if (posisi < teks.length) hasil.push({ jenis: "teks", isi: teks.slice(posisi) });
  return hasil;
}

function TombolIstilah({ isi, istilah }: { isi: string; istilah: Istilah }) {
  const [terbuka, setTerbuka] = useState(false);
  const idPenjelasan = useId();

  return (
    <>
      <button
        type="button"
        className="istilah"
        aria-expanded={terbuka}
        aria-controls={terbuka ? idPenjelasan : undefined}
        title={`Apa itu ${istilah.judul}?`}
        onClick={() => setTerbuka((t) => !t)}
      >
        {isi}
      </button>
      {terbuka && (
        <span className="gelembung" id={idPenjelasan} role="note">
          <strong>{istilah.judul}</strong>
          {istilah.penjelasan}
        </span>
      )}
    </>
  );
}

/**
 * Menampilkan teks biasa, tapi setiap istilah akuntansi yang ada di kamus jadi
 * bisa diklik untuk memunculkan penjelasan singkat di tempat.
 */
export default function TeksBerkamus({ children }: { children: string }) {
  const potongan = potong(children);
  return (
    <>
      {potongan.map((p, i) =>
        p.jenis === "istilah" ? (
          <TombolIstilah key={i} isi={p.isi} istilah={p.istilah} />
        ) : (
          <Fragment key={i}>{p.isi}</Fragment>
        ),
      )}
    </>
  );
}
