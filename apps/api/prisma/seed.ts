import {config} from 'dotenv';
config({path:'../../.env'});
const {db}=await import('../src/db.js');
const {venue,fullMenus,verifiedEvents,verifiedSpecials}=await import('../../../packages/shared/src/index.ts');
try{
 await db.venue.upsert({where:{id:venue.id},create:venue,update:venue});
 // Retire only the three placeholder highlights from the initial development seed.
 await db.menuItem.updateMany({where:{id:{in:['burger','nachos','pitchers']}},data:{available:false,featured:false}});
 for(const [displayOrder,category] of fullMenus.entries()){
  const {items,...meta}=category;const data={...meta,slug:category.id,displayOrder};const {id:_,...update}=data;const persisted=await db.menuCategory.upsert({where:{slug:category.id},create:data,update});
  for(const [i,item] of items.entries()){const data={...item,categoryId:persisted.id,available:true,featured:['classic-burger','loaded-nachos','margarita-pitcher'].includes(item.id),displayOrder:i};await db.menuItem.upsert({where:{id:item.id},create:data,update:data});}
 }
 for(const event of verifiedEvents)await db.event.upsert({where:{id:event.id},create:event,update:event});
 for(const {endsAt,source:_,...special} of verifiedSpecials){const data={...special,expiresAt:endsAt};await db.special.upsert({where:{id:special.id},create:data,update:data});}
}finally{await db.$disconnect();}
