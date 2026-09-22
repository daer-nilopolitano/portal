/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Imagens vêm do backend Django (MEDIA_URL), que é outro domínio.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
      { protocol: "https", hostname: "p01--backend--9l6dvd9xzxnm.code.run" },
      { protocol: "https", hostname: "pub-3665e297a9094e04a5761e404ef4a7cb.r2.dev" },
    ],
  },
};

module.exports = nextConfig;
