"use client";

/**
 * Safari belum bisa `for await (… of stream)`.
 *
 * Membaca ReadableStream dengan perulangan `for await` sudah lama jadi standar
 * dan dipakai Chrome maupun Firefox, tapi Safari — termasuk iOS 18 — belum
 * memasangnya. Padahal pdfjs mengambil teks tiap halaman persis dengan cara itu:
 *
 *     const readableStream = this.streamTextContent(params);
 *     for await (const value of readableStream) { … }
 *
 * Akibatnya di iPhone dokumennya terbuka normal, jumlah halamannya terbaca,
 * lalu gagal di halaman pertama dengan "undefined is not a function" — karena
 * yang tidak ada itu `stream[Symbol.asyncIterator]`.
 *
 * Ini bukan bagian ECMAScript, jadi polyfill core-js di build legacy pdfjs pun
 * tidak menutupinya. Isinya dipasang sesuai perilaku baku ReadableStream.
 */
export function pasangTambalanSafari(): void {
  if (typeof ReadableStream === "undefined") return;

  const proto = ReadableStream.prototype as ReadableStream & {
    [Symbol.asyncIterator]?: unknown;
    values?: unknown;
  };
  if (proto[Symbol.asyncIterator]) return;

  function nilai(
    this: ReadableStream,
    { preventCancel = false }: { preventCancel?: boolean } = {},
  ) {
    const pembaca = this.getReader();
    return {
      async next() {
        try {
          const { done, value } = await pembaca.read();
          if (done) pembaca.releaseLock();
          return done
            ? { done: true as const, value: undefined }
            : { done: false as const, value };
        } catch (e) {
          pembaca.releaseLock();
          throw e;
        }
      },
      async return(value?: unknown) {
        if (preventCancel) {
          pembaca.releaseLock();
        } else {
          const batal = pembaca.cancel(value);
          pembaca.releaseLock();
          await batal;
        }
        return { done: true as const, value };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  proto.values = nilai;
  (proto as unknown as Record<symbol, unknown>)[Symbol.asyncIterator] = nilai;
}
