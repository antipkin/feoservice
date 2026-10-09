// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🎯 ВАЖНО для Docker: создаёт минимальный standalone-сервер для production
  output: 'standalone',
  
  // (Опционально) Если у вас есть другие настройки, добавьте их сюда
  // reactStrictMode: true,
};

export default nextConfig;