import http from 'node:http';
import {readFile,writeFile,mkdir,rename,readdir} from 'node:fs/promises';
import {createHash,randomBytes,timingSafeEqual,createHmac} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.DATA_DIR||join(root,'data');
const adminPassword=process.env.ADMIN_PASSWORD||'';
const price=98000;
const sessionSecret=process.env.SESSION_SECRET||randomBytes(32).toString('hex');
await mkdir(dataDir,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const files={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/assets/mockup.png':'assets/mockup.png','/admin':'admin.html','/admin.js':'admin.js'};
for(const asset of ['hero-hd.webp','hero-4k.webp','product-hd.webp','campaign-hd.webp','cta-hd.webp','avatars-hd.webp','logo.svg','logo-wide.svg'])files['/assets/'+asset]='assets/'+asset;
const limits=new Map();
function limited(key,max=15){const now=Date.now();const record=limits.get(key);if(!record||now-record.at>600000){limits.set(key,{at:now,n:1});return false;}return ++record.n>max;}
setInterval(()=>{const now=Date.now();for(const [k,v]of limits)if(now-v.at>600000)limits.delete(k);},600000).unref();
function hash(text){return createHash('sha256').update(String(text)).digest();}
function same(a,b){return timingSafeEqual(hash(a),hash(b));}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let total=0;const chunks=[];for await(const chunk of req){total+=chunk.length;if(total>12000)throw Error('Data terlalu panjang.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw Error('Data tidak valid.');}}
function sign(value){return createHmac('sha256',sessionSecret).update(value).digest('hex');}
function authenticated(req){const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('tmc_admin='))?.slice(10);if(!value)return false;const [expires,signature]=value.split('.');return Number(expires)>Date.now()&&same(signature,sign(expires));}
async function save(path,data){const temp=path+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temp,JSON.stringify(data),{mode:0o600});await rename(temp,path);}
const statuses=['Menunggu konfirmasi','Menunggu pembayaran','Dibayar','Diproses','Dikirim','Selesai','Dibatalkan'];
export function validateOrder(data){
  const fields={name:[2,100],phone:[9,20],address:[10,500],city:[2,100],postalCode:[5,5],notes:[0,300]};const clean={};
  for(const [key,[min,max]]of Object.entries(fields)){if(data[key]!==undefined&&typeof data[key]!=='string')throw Error('Data tidak valid.');const v=(data[key]||'').trim();if(v.length<min||v.length>max)throw Error('Mohon lengkapi data pengiriman dengan benar.');clean[key]=v;}
  if(!/^[+0-9 ()-]{9,20}$/.test(clean.phone)||!/^\d{5}$/.test(clean.postalCode)||!Number.isInteger(data.quantity)||data.quantity<1||data.quantity>99||data.consent!==true||data.website)throw Error('Mohon periksa nomor telepon, kode pos, jumlah, dan persetujuan data.');
  return {...clean,quantity:data.quantity,subtotal:price*data.quantity};
}
let queue=Promise.resolve();
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  const url=new URL(req.url,'http://local');const path=url.pathname;const client=req.headers['x-forwarded-for']?.split(',')[0]||req.socket.remoteAddress;
  if(['POST','PATCH'].includes(req.method)&&req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Permintaan ditolak.'});}catch{return json(res,403,{error:'Permintaan ditolak.'});}}
  try{
    if(path==='/health')return json(res,200,{ok:true});
    if(path==='/api/store'&&req.method==='GET')return json(res,200,{price,currency:'IDR',whatsapp:process.env.STORE_WHATSAPP||'',shippingFee:process.env.SHIPPING_FEE?Number(process.env.SHIPPING_FEE):null,paymentLabel:process.env.PAYMENT_LABEL||'Pembayaran dikonfirmasi setelah pesanan diterima'});
    if(path==='/api/orders'&&req.method==='POST'){
      if(process.env.ORDERS_ENABLED!=='true')return json(res,503,{error:'Saat ini checkout hanya menyimpan data penerima di perangkat. Pengiriman pesanan belum diaktifkan.'});
      if(limited('orders:'+client))return json(res,429,{error:'Terlalu banyak percobaan. Silakan coba beberapa saat lagi.'});
      const key=req.headers['idempotency-key'];if(!/^[a-zA-Z0-9-]{16,80}$/.test(key||''))return json(res,400,{error:'Identitas pesanan tidak valid.'});const data=validateOrder(await body(req));
      const task=queue.then(async()=>{const recordPath=join(dataDir,hash(key).toString('hex')+'.json');try{const old=JSON.parse(await readFile(recordPath,'utf8'));if(old.requestHash!==hash(JSON.stringify(data)).toString('hex'))return json(res,409,{error:'Data berubah. Muat ulang halaman sebelum membuat pesanan baru.'});return json(res,200,{id:old.id,token:old.token,quantity:old.quantity,subtotal:old.subtotal});}catch(err){if(err.code!=='ENOENT')throw err;}
        const id='TMC-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+randomBytes(4).toString('hex').toUpperCase();const order={...data,id,token:randomBytes(24).toString('hex'),status:statuses[0],createdAt:new Date().toISOString(),requestHash:hash(JSON.stringify(data)).toString('hex')};await save(recordPath,order);json(res,201,{id,token:order.token,quantity:order.quantity,subtotal:order.subtotal});});queue=task.catch(()=>{});await task;return;
    }
    if(path.startsWith('/api/orders/')&&req.method==='GET'){
      if(limited('lookup:'+client,50))return json(res,429,{error:'Coba kembali nanti.'});const id=path.split('/').pop();const order=await findOrder(id);if(!order||!same(req.headers['x-order-token']||'',order.data.token))return json(res,404,{error:'Pesanan tidak ditemukan.'});const {status,subtotal,quantity,createdAt}=order.data;return json(res,200,{id,status,subtotal,quantity,createdAt});
    }
    if(path==='/api/admin/login'&&req.method==='POST'){
      if(limited('login:'+client,8))return json(res,429,{error:'Coba lagi dalam 10 menit.'});const data=await body(req);if(!adminPassword||!same(data.password||'',adminPassword))return json(res,401,{error:'Kata sandi salah.'});const expires=String(Date.now()+8*3600000);res.setHeader('Set-Cookie',`tmc_admin=${expires}.${sign(expires)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);return json(res,200,{ok:true});
    }
    if(path.startsWith('/api/admin/')){
      if(!authenticated(req))return json(res,401,{error:'Silakan masuk.'});
      if(path==='/api/admin/logout'&&req.method==='POST'){res.setHeader('Set-Cookie','tmc_admin=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0');return json(res,200,{ok:true});}
      if(path==='/api/admin/orders'&&req.method==='GET'){const orders=await allOrders();return json(res,200,{orders:orders.map(({token,requestHash,...o})=>o).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),statuses});}
      if(path.startsWith('/api/admin/orders/')&&req.method==='PATCH'){const {status}=await body(req);if(!statuses.includes(status))return json(res,400,{error:'Status tidak valid.'});const order=await findOrder(path.split('/').pop());if(!order)return json(res,404,{error:'Tidak ditemukan.'});await save(order.path,{...order.data,status,updatedAt:new Date().toISOString()});return json(res,200,{ok:true});}
    }
    if(files[path]&&['GET','HEAD'].includes(req.method)){const filename=files[path];const data=await readFile(join(root,filename));const ext='.'+filename.split('.').pop();res.setHeader('Content-Type',types[ext]);res.setHeader('Cache-Control',ext==='.png'?'public, max-age=604800':'no-cache');res.statusCode=200;return res.end(req.method==='HEAD'?undefined:data);}
    return json(res,404,{error:'Halaman tidak ditemukan.'});
  }catch(err){if(err.code==='ENOENT')return json(res,404,{error:'Tidak ditemukan.'});if(/data|Data|valid|Mohon|panjang/.test(err.message))return json(res,400,{error:err.message});console.error('Request failed:',err.code||err.name);return json(res,500,{error:'Pesanan belum dapat diproses. Silakan coba kembali.'});}
});
async function allOrders(){const names=(await readdir(dataDir)).filter(x=>x.endsWith('.json'));return Promise.all(names.map(n=>readFile(join(dataDir,n),'utf8').then(JSON.parse)));}
async function findOrder(id){if(!/^TMC-\d{8}-[A-F0-9]{8}$/.test(id))return null;for(const name of (await readdir(dataDir)).filter(x=>x.endsWith('.json'))){const path=join(dataDir,name);const data=JSON.parse(await readFile(path,'utf8'));if(data.id===id)return {path,data};}return null;}
if(process.env.NODE_ENV!=='test'){server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('The Mens Code store ready'));}
export {server};
