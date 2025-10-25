/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuración de TypeScript
  typescript: {
    // Habilitar verificación de tipos estricta
    ignoreBuildErrors: false,
    // Verificar tipos durante el desarrollo
    tsconfigPath: './tsconfig.json',
  },
  // Configuración de imágenes
  images: {
    domains: [
      'localhost',
      'imgaohzjravmwqklitpq.supabase.co',
      'imgaohzjravmwqklitpq.supabase.in'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imgaohzjravmwqklitpq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/services/images/**',
      },
    ],
  },
};

export default nextConfig;
