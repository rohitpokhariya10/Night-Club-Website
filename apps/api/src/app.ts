import express, {type ErrorRequestHandler} from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {rateLimit} from 'express-rate-limit';
import {pinoHttp} from 'pino-http';
import {inquirySchema} from '../../../packages/shared/src/index.ts';
import {db} from './db.js';
export function createApp(database=db){
 const app=express();
 app.disable('x-powered-by');
 // Production exposes only Caddy; it overwrites forwarding headers before proxying.
 if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
 app.use(helmet(),cors({origin:process.env.WEB_ORIGIN || 'http://localhost:3000'}),pinoHttp({redact:['req.headers.authorization','req.headers.cookie'],autoLogging:process.env.NODE_ENV!=='test'}));
 app.use(express.json({limit:'16kb'}));
 app.use('/api',rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false}));
 app.get('/api/v1/health',async(_req,res)=>{try{await database.$queryRaw`SELECT 1`;res.json({data:{status:'ok',database:'connected'}});}catch{res.status(503).json({error:{code:'UNAVAILABLE',message:'Database unavailable'}});}});
 app.get('/api/v1/venue',async(_req,res)=>{const data=await database.venue.findUnique({where:{id:'jimmy-os'}});res.json({data});});
 app.get('/api/v1/menu/highlights',async(_req,res)=>{const rows=await database.menuItem.findMany({where:{featured:true,available:true},include:{category:true},orderBy:{displayOrder:'asc'}});res.json({data:rows.map(r=>({...r,category:r.category.name}))});});
 app.get('/api/v1/events/upcoming',async(_req,res)=>{res.json({data:await database.event.findMany({where:{published:true,startsAt:{gt:new Date()}},orderBy:{startsAt:'asc'},take:12})});});
 app.get('/api/v1/menus/:kind',async(req,res)=>{const kind=req.params.kind.toUpperCase();if(!['FOOD','DRINK'].includes(kind)){res.status(404).json({error:{code:'NOT_FOUND',message:'Menu not found'}});return;}res.json({data:await database.menuCategory.findMany({where:{kind,items:{some:{available:true}}},include:{items:{where:{available:true},orderBy:{displayOrder:'asc'}}},orderBy:{displayOrder:'asc'}})});});
 app.get('/api/v1/specials',async(_req,res)=>{const now=new Date();const rows=await database.special.findMany({where:{published:true,OR:[{expiresAt:null},{expiresAt:{gt:now}}]},orderBy:{startsAt:'asc'}});res.json({data:rows.map(r=>({...r,endsAt:r.expiresAt}))});});
 app.get('/api/v1/events/:slug',async(req,res)=>{const data=await database.event.findUnique({where:{slug:req.params.slug as string}});if(!data?.published){res.status(404).json({error:{code:'NOT_FOUND',message:'Event not found'}});return;}res.json({data});});
 app.post(['/api/v1/inquiries','/api/v1/catering-inquiries','/api/v1/party-inquiries','/api/v1/reservation-requests','/api/v1/contact-inquiries','/api/v1/job-applications'],rateLimit({windowMs:3600000,limit:5,standardHeaders:'draft-8',legacyHeaders:false,message:{error:{code:'RATE_LIMIT',message:'Please try again later or call the venue.'}}}),async(req,res)=>{
 const origin=req.get('origin');
 if(origin && origin!==(process.env.WEB_ORIGIN || 'http://localhost:3000')){res.status(403).json({error:{code:'FORBIDDEN',message:'Origin not allowed'}});return;}
 const routeTypes:Record<string,string>={'catering-inquiries':'CATERING','party-inquiries':'PARTY','reservation-requests':'TABLE','contact-inquiries':'GENERAL','job-applications':'JOB'};
 const fixedType=routeTypes[req.path.split('/').pop() || ''];
 const parsed=inquirySchema.safeParse({...req.body,...(fixedType?{type:fixedType}:{})});
 if(!parsed.success){res.status(400).json({error:{code:'VALIDATION',message:'Please check your information.',fields:parsed.error.flatten().fieldErrors}});return;}
 const {website:_,eventDate,...input}=parsed.data;
 const record=await database.inquiry.create({data:{...input,eventDate:eventDate?new Date(eventDate):undefined}});
 res.status(201).json({data:{id:record.id,message:input.type==='JOB'?'Your expression of interest has been received. This does not confirm a vacancy or interview.':input.type==='GENERAL'?'Your message has been received. Our team will follow up.':'Your inquiry has been received. Your booking is not confirmed yet.'}});
 });
 app.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Endpoint not found'}}));
 const handler:ErrorRequestHandler=(err,req,res,_next)=>{req.log.error({errorName:err.name,errorCode:err.code},'Request failed');const status=err.type==='entity.too.large'?413:err instanceof SyntaxError?400:503;res.status(status).json({error:{code:status===503?'UNAVAILABLE':'BAD_REQUEST',message:status===503?'We could not complete your request. Please try again or call (858) 350-3735.':'Invalid request body.'}});};
 app.use(handler);return app;
}
