import type {MetadataRoute} from 'next';
import {getEvents} from '@/lib/api';
import {siteUrl} from '@/lib/seo';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const routes=['','/food-menu','/drink-menu','/specials','/events','/nightlife','/catering','/jobs','/private-parties','/reservations','/gallery','/about','/contact','/privacy'];const events=await getEvents();return [...routes,...events.map(e=>`/events/${e.slug}`)].map(path=>({url:`${siteUrl}${path}`,changeFrequency:'weekly',priority:path?0.7:1}));}
