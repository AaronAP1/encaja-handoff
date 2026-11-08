import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hay un package-lock.json suelto en la carpeta de usuario: fijamos la raíz al proyecto
  turbopack: { root: __dirname },
};

export default nextConfig;
