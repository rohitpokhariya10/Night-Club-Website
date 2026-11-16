import type {Metadata} from 'next';
export const siteUrl=process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export function pageMeta(title:string,description:string,path:string,image='gallery-1.jpg'):Metadata{return {title,description,alternates:{canonical:path},openGraph:{title:`${title} | Jimmy O’s Del Mar`,description,url:path,type:'website',images:[{url:`/images/${image}`,alt:title}]},twitter:{card:'summary_large_image',title,description,images:[`/images/${image}`]}};}
