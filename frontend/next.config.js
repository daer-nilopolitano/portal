/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").origin;

const remotePatterns = [
  { protocol: "http", hostname: "localhost", port: "8000" },
  { protocol: "http", hostname: "127.0.0.1", port: "8000" },
  { protocol: "https", hostname: "p01--backend--9l6dvd9xzxnm.code.run" },
  { protocol: "https", hostname: "pub-3665e297a9094e04a5761e404ef4a7cb.r2.dev" },
];

// Origens de mídia derivadas do mesmo remotePatterns.
const midiaOrigins = remotePatterns.map(
  (p) => `${p.protocol}://${p.hostname}${p.port ? `:${p.port}` : ""}`,
);

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${apiOrigin} ${midiaOrigins.join(" ")}`,
  `media-src 'self' ${midiaOrigins.join(" ")}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Imagens vêm do backend Django (MEDIA_URL), que é outro domínio.
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
