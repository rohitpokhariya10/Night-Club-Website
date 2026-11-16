import { z } from 'zod';
export const inquirySchema = z.object({
 name:z.string().trim().min(2).max(100), email:z.email().max(254), phone:z.string().trim().max(30).optional(),
 type:z.enum(['TABLE','PARTY','GENERAL','CATERING','JOB']), message:z.string().trim().min(10).max(3000),
 eventDate:z.iso.date().optional().refine(v=>!v || v >= new Date().toLocaleDateString('en-CA',{timeZone:'America/Los_Angeles'}),'Choose today or a future date'),
 preferredTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), position:z.string().trim().max(100).optional(), availability:z.string().trim().max(500).optional(),
 guestCount:z.number().int().min(1).max(500).optional(), consent:z.literal(true), marketingConsent:z.boolean().default(false), website:z.string().max(0).optional()
}).superRefine((data,ctx)=>{if(data.type==='TABLE'){for(const key of ['eventDate','preferredTime','guestCount'] as const){if(!data[key])ctx.addIssue({code:'custom',path:[key],message:'Required for a reservation request'});}}if(data.type==='JOB'&&!data.availability)ctx.addIssue({code:'custom',path:['availability'],message:'Please share your availability'});});
export type InquiryInput=z.infer<typeof inquirySchema>;
export const venue={id:'jimmy-os',name:"Jimmy O’s",description:'A coastal neighborhood bar with food, drinks, live entertainment and weekend dancing in the heart of Del Mar.',address:'225 15th Street, Del Mar, CA 92014',phone:'(858) 350-3735',email:'chelsea@jodelmar.com',hours:[{days:'Monday',hours:'Closed'},{days:'Tuesday – Thursday',hours:'5 PM – 2 AM'},{days:'Friday – Sunday',hours:'12 PM – 2 AM'}],socialLinks:[] as string[]};
export const menuHighlights=[{id:'burger',name:"Jimmy O’s Classic Burger",description:'American cheese, crisp lettuce, tomato, pickles and house special sauce.',category:'Food',image:'/images/burger.jpg'},{id:'nachos',name:"Jimmy O’s Loaded Nachos",description:'Chicken, melted cheese, black beans, pico de gallo and fresh jalapeños.',category:'Food',image:'/images/nachos.jpg'},{id:'pitchers',name:'Cocktail Pitchers',description:'Margarita, Paloma or Moscow Mule. A round made for sharing.',category:'Drinks',image:'/images/hero.jpg'}];
export const verifiedEvents=[
 {id:'pizza-day-2027',slug:'national-pizza-day-2027',name:'National Pizza Day',description:'Join us for National Pizza Day February 9th.',startsAt:'2027-02-09T19:00:00.000Z',endsAt:'2027-02-10T10:00:00.000Z',image:'/images/flatbread.jpg',published:true},
 {id:'thanksgiving-2026',slug:'thanksgiving-2026',name:'Thanksgiving',description:'Gather your favorite people for a holiday at Jimmy O’s.',startsAt:'2026-11-26T19:00:00.000Z',endsAt:'2026-11-27T10:00:00.000Z',image:'/images/venue.jpg',published:true},
 {id:'christmas-2026',slug:'christmas-2026',name:'Christmas',description:'Spend a little holiday time by the coast.',startsAt:'2026-12-25T19:00:00.000Z',endsAt:'2026-12-26T10:00:00.000Z',image:'/images/hero.jpg',published:true},
 {id:'nye-2026',slug:'nye-2026',name:'New Year’s Eve',description:'One more story before the year is out.',startsAt:'2026-12-31T19:00:00.000Z',endsAt:'2027-01-01T10:00:00.000Z',image:'/images/gallery-1.jpg',published:true}
];
export type Venue=typeof venue;
export type MenuHighlight=typeof menuHighlights[number];
export type PublicEvent=typeof verifiedEvents[number];
export * from './content.ts';
