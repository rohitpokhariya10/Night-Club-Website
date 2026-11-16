/** Official-site content verified 2026-11-14. See CONTENT-SOURCES.md. */
export type MenuItemContent = {id:string;name:string;description:string;priceLabel:string;price?:number;image?:string};
export type MenuCategoryContent = {id:string;name:string;kind:'FOOD'|'DRINK';description?:string;items:MenuItemContent[]};
const food=(id:string,name:string,price:number,description:string,image?:string):MenuItemContent=>({id,name,price,priceLabel:`$${price.toFixed(2)}`,description,...(image?{image}:{})});
const drink=(id:string,name:string,priceLabel:string,description=''):MenuItemContent=>({id,name,priceLabel,description});
export const fullMenus:MenuCategoryContent[]=[
 {id:'appetizers',name:'Appetizers',kind:'FOOD',items:[
  food('hummus-pita','Hummus & Pita',9,'Creamy chickpea hummus, olive oil, paprika, and warm pita bread.'),
  food('fried-pickles','Fried Pickles',8,'Crispy breaded dill pickle chips fried golden, and served with ranch.'),
  food('house-queso','House Queso & Chips',12,'Creamy melted white cheese blended with fresh tomatoes, jalapeños, and savory spices, and served warm with crispy tortilla chips.'),
  food('loaded-nachos',"Jimmy O’s Loaded Nachos",14,'Crispy tortilla chips layered with melted cheddar & jack cheese, grilled chicken, black beans, pico de gallo, and fresh jalapeños, and finished with sour cream, house chipotle crema, green onions, and cilantro.','/images/nachos.jpg'),
  food('signature-quesadilla','Signature Quesadilla',12,'Large grilled flour tortilla filled with melted cheddar-jack cheese and diced grilled chicken, and served with pico de gallo and sour cream on the side.'),
  food('house-wings','House Tossed Wings (8)',13,'Crispy wings tossed in your choice of sauce, and served with celery, carrots, and ranch. Sauce choices: Buffalo, BBQ, Korean BBQ, Sweet Red Chili, Parmesan Garlic.','/images/wings.jpg')
 ]},
 {id:'food',name:'Food',kind:'FOOD',items:[
  food('chicken-strips','Crispy Chicken Strips & Fries (3)',12,'Crispy golden tenders paired with hot seasoned fries and house dipping sauce.'),
  food('classic-burger',"Jimmy O’s Classic Burger",14,'Juicy beef patty topped with melted American cheese, crisp lettuce, tomato, pickles, and our house special sauce, and served on a toasted brioche bun with seasoned fries. Add-ons: Extra Patty +$4; Extra Cheese +$2; Bacon +$3; Avocado +$3; Fried Egg +$2; Jalapeños +$1; Caramelized Onions +$1; Extra Special Sauce +$1.','/images/burger.jpg'),
  food('baja-tacos','Baja Fish Tacos (2)',14,'Crispy battered white fish tucked into warm corn tortillas with shredded cabbage, pico de gallo, and house chipotle crema, and served with lime wedges.'),
  food('carne-asada-tacos','Carne Asada Tacos',14,'Your choice of 2. Options: Carne Asada, Chicken, Pork, Fried Fish; Guac, Cheese, Pico, Lettuce; Cabbage for Fish. Add chips and salsa for $3.00.'),
  food('house-sides','House Sides',6,'French Fries, Mozzarella Sticks, or Crispy Onion Rings.')
 ]},
 {id:'flatbreads',name:'Flatbreads',kind:'FOOD',items:[
  food('margherita','Margherita Flatbread',14,'Tomato sauce, fresh mozzarella, basil, and olive oil drizzle.','/images/flatbread.jpg'),
  food('bbq-flatbread','BBQ Chicken Flatbread',15,'BBQ sauce, grilled chicken, mozzarella, red onion, and cilantro.'),
  food('pepperoni-flatbread','Pepperoni Flatbread',14,'Tomato sauce, mozzarella, pepperoni, and oregano.'),
  food('burrata-flatbread','Burrata Bruschetta Flatbread',16,'Crisp flatbread topped with fresh bruschetta, creamy burrata, basil, and balsamic glaze.')
 ]},
 {id:'salads',name:'Salads',kind:'FOOD',items:[food('classic-caesar','Classic Caesar',10,'Crisp romaine lettuce, parmesan cheese, crunchy croutons, and house Caesar dressing. Add protein: Grilled Chicken +$4.00; Steak +$7.00.')]},
 {id:'after-dark',name:'After Dark Menu',kind:'FOOD',description:'Please ask the team when the after-dark menu is available.',items:[
  food('after-dark-wings','Wings',1.5,'Crispy, juicy wings tossed in your choice of spicy garlic, buffalo, BBQ, or garlic parmesan. Served with ranch or bleu cheese. Ask the team about portion size.'),
  food('mozzarella-sticks','Mozzarella Sticks',5,'Golden-fried mozzarella served with warm marinara sauce — a crowd favorite.'),
  food('after-dark-nachos','Nachos',12,'Loaded tortilla chips stacked with melted cheese, jalapeños, pico de gallo, sour cream & guacamole. Add chicken or beef +$3.00.'),
  food('after-dark-burger','Cheeseburger',10,'Classic all-beef patty topped with melted American cheese, lettuce, tomato, pickles & house sauce. Served with fries.'),
  food('after-hours-platter','After Hours Platter',18,'A shareable combo featuring boneless wings, mozzarella sticks, crispy onion rings, and seasoned fries, the ultimate bar favorite lineup.')
 ]},
 {id:'bottled-beer',name:'Bottled Beer',kind:'DRINK',description:'The bucket contains six bottles of beer.',items:[
  drink('bottle-coors','Coors Light','$7 Single / $40 Bucket'),drink('bottle-michelob','Michelob Ultra','$7 Single / $40 Bucket'),drink('bottle-michelob-zero','Michelob Ultra Zero','$7 Single / $40 Bucket'),drink('bottle-modelo','Modelo Especial','$9 Single / $50 Bucket'),drink('bottle-pacifico','Pacifico','$9 Single / $50 Bucket'),drink('bottle-corona','Corona','$9 Single / $50 Bucket'),drink('bottle-corona-zero','Corona 0','$9 Single / $50 Bucket')
 ]},
 {id:'draft-beer',name:'Draft Beer',kind:'DRINK',items:[
  drink('draft-coors','Coors Light','$7 Pint / $25 Pitcher','Light Lager | 4.2%'),drink('draft-michelob','Michelob Ultra','$7 Pint / $25 Pitcher','Light Lager | 4.8%'),drink('draft-stella','Stella Artois','$9 Pint / $38 Pitcher','Pilsner | 5%'),drink('draft-shock-top','Shock Top','$9 Pint / $38 Pitcher','Belgian White | 5.2%'),drink('draft-kona','Kona Big Wave','$9 Pint / $40 Pitcher','Golden Ale | 4.4%'),drink('draft-space-dust','Space Dust IPA','$10 Pint / $40 Pitcher','8.2%')
 ]},
 {id:'wine-bubbles',name:'Wine & Bubbles',kind:'DRINK',items:[
  drink('chardonnay','Chardonnay','$9 Glass / $35 Bottle'),drink('pinot-grigio','Pinot Grigio','$9 Glass / $35 Bottle'),drink('sauvignon-blanc','Sauvignon Blanc','$9 Glass / $35 Bottle'),drink('cabernet','Cabernet Sauvignon','$9 Glass / $35 Bottle'),drink('champagne','House Champagne','$9 Glass / $40 Bottle')
 ]},
 {id:'cocktail-pitchers',name:'Cocktail Pitchers',kind:'DRINK',items:[food('margarita-pitcher','Margarita',55,''),food('paloma-pitcher','Paloma',55,''),food('mule-pitcher','Moscow Mule',55,'')]},
 {id:'cocktail-tree',name:'Cocktail Tree Stand',kind:'DRINK',items:[food('mimosa-flight','Mimosa Flight (6)',75,''),food('aperol-spritz','Aperol Spritz (6)',110,''),food('mexican-candy','Mexican Candy Shots (6)',75,'')]}
];

export type SpecialContent={id:string;slug:string;title:string;description:string;priceLabel:string;startsAt:string;endsAt:string;published:boolean;image:string;source:string};
export const verifiedSpecials:SpecialContent[]=[
 {id:'early-night-2026-11-13',slug:'early-night-friday',title:'Early Night Special',description:'Bottle + Booth',priceLabel:'$150.00',startsAt:'2026-11-14T01:00:00.000Z',endsAt:'2026-11-14T06:00:00.000Z',published:true,image:'/images/gallery-2.jpg',source:'https://jimmyodelmar.com/specials'},
 {id:'early-night-2026-11-14',slug:'early-night-saturday',title:'Early Night Special',description:'Bottle + Booth',priceLabel:'$150.00',startsAt:'2026-11-14T20:00:00.000Z',endsAt:'2026-11-15T06:00:00.000Z',published:true,image:'/images/gallery-3.jpg',source:'https://jimmyodelmar.com/specials'}
];
export const guestReviews=[{author:'Oscar R.',platform:'Google review, featured on Jimmy O’s website',quote:'Nice local place to watch a game, dance, hang out, eat, and drink good cocktails.',source:'https://jimmyodelmar.com/',reviewUrl:'https://www.google.com/maps/place/?q=place_id:ChIJjdm5G7UI3IARHyJ60DOCAEQ'}];
export const originalNavigation=[{label:'Menu',href:'/food-menu'},{label:'Drinks',href:'/drink-menu'},{label:'Specials',href:'/specials'},{label:'Events',href:'/events'},{label:'Catering',href:'/catering'},{label:'Jobs',href:'/jobs'},{label:'Parties',href:'/private-parties'}];
/** No Instagram/Facebook links were verifiable in the official source. */
export const socialLinks:{label:string;href:string}[]=[];
export const venueContent={
 about:'In the heart of Del Mar, Jimmy O’s brings together a neighborhood bar, a coastal hangout and a late-night dance floor. Stop in for food and cold drinks, catch a game, sing karaoke, or spend the weekend dancing with friends.',
 offerings:['Food and drinks','Live entertainment','Karaoke','Sports and football Sundays','Weekend dancing','DJs','Bottle service','Private events'],
 catering:{title:'Let us cater your next event',description:'Jimmy O’s offers catering for intimate gatherings and larger celebrations, with food and a menu tailored to the occasion.',occasions:['Birthdays','Holiday parties','Corporate events','Wedding festivities'],source:'https://jimmyodelmar.com/catering'},
 parties:{title:'Group reservations and private parties',description:'Bring friends, family or colleagues together at Jimmy O’s. Ask the team about a private dining space and a celebration tailored to your group.',occasions:['Birthdays','Anniversaries','Rehearsal dinners','Corporate gatherings','Holiday parties','Special occasions'],source:'https://jimmyodelmar.com/party'},
 careers:{title:'Bring your talent to Jimmy O’s',description:'The original website invites applications for its food and hospitality team. Share your experience and interests so the team can get in touch when there is a suitable opportunity.',openings:[] as {title:string;description:string}[],source:'https://jimmyodelmar.com/'},
 reservationNote:'Send a reservation request with your preferred date, time and party size. Your table is only confirmed after the venue contacts you.',
 verifiedAt:'2026-11-14',
 directionsUrl:'https://www.google.com/maps/dir/?api=1&destination=Jimmy%20O%27s&destination_place_id=ChIJjdm5G7UI3IARHyJ60DOCAEQ'
};
