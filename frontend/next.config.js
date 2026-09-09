/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Fotos de Pessoa vêm do backend Django (MEDIA_URL), que é outro domínio.
    // Em produção, adicionar aqui o domínio real do backend no Northflank.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
    ],
  },
};

module.exports = nextConfig;
