/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Batas ukuran body untuk Server Actions tidak dipakai; upload PDF diproses
    // di browser dan hanya teksnya yang dikirim ke server.
  },
};

export default nextConfig;
