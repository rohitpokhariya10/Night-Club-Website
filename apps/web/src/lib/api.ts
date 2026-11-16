import {venue,menuHighlights,verifiedEvents,fullMenus,verifiedSpecials,type Venue,type MenuHighlight,type PublicEvent,type MenuCategoryContent,type SpecialContent} from '@jimmy/shared';
async function read<T>(path:string,fallback:T):Promise<T>{try{const res=await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/v1/${path}`,{next:{revalidate:60},signal:AbortSignal.timeout(2500)});if(!res.ok)return fallback;const result=await res.json();return result.data ?? fallback;}catch{return fallback;}}
export const getVenue=()=>read<Venue>('venue',venue);
export const getMenu=()=>read<MenuHighlight[]>('menu/highlights',menuHighlights);
export const getFullMenu=(kind:'FOOD'|'DRINK')=>read<MenuCategoryContent[]>(`menus/${kind.toLowerCase()}`,fullMenus.filter(c=>c.kind===kind));
export const getEvents=()=>read<PublicEvent[]>('events/upcoming',verifiedEvents.filter(e=>new Date(e.startsAt)>new Date()).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)));
export async function getEvent(slug:string){try{const res=await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/v1/events/${encodeURIComponent(slug)}`,{next:{revalidate:60},signal:AbortSignal.timeout(2500)});if(res.status===404)return null;if(res.ok)return (await res.json()).data as PublicEvent;}catch{}return verifiedEvents.find(e=>e.slug===slug&&e.published) || null;}
export const getSpecials=()=>read<SpecialContent[]>('specials',verifiedSpecials.filter(s=>s.published&&new Date(s.endsAt)>new Date()));
