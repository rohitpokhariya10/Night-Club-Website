import {createApp} from './app.js';
import {db} from './db.js';
const server=createApp().listen(Number(process.env.PORT || 4000),'0.0.0.0',()=>console.log('API listening on :4000'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>{void db.$disconnect().then(()=>process.exit(0));});});
