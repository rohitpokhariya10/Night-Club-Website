import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@jimmy/shared'], images:{qualities:[65,75],formats:['image/avif','image/webp']}, async redirects(){return [{source:'/menu',destination:'/food-menu',permanent:true},{source:'/parties',destination:'/private-parties',permanent:true}]}, async rewrites() { return [{source:'/api/v1/:path*', destination:`${process.env.API_URL || 'http://localhost:4000'}/api/v1/:path*`}]; } };
export default config;
