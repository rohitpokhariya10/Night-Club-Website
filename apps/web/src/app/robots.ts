import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',...(process.env.INDEXING_ENABLED==='true'?{allow:'/',disallow:'/api/'}:{disallow:'/'})},sitemap:`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sitemap.xml`}}
