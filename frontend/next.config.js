/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Imagens vêm do backend Django (MEDIA_URL), que é outro domínio.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
      { protocol: "https", hostname: "p01--backend--6xggq4ccj4b6.code.run" },
    ],
  },
};

module.exports = nextConfig;
