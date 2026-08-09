/**
 * pdfjs tidak menyertakan tipe untuk berkas worker-nya, karena normalnya berkas
 * itu tidak pernah diimpor — cuma ditunjuk lewat URL. Di sini ia memang diimpor
 * sungguhan, sebagai jalan mundur waktu module worker tidak bisa dipakai.
 */
declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs" {
  export const WorkerMessageHandler: unknown;
}
