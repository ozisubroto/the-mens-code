import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.NODE_ENV='test';process.env.ADMIN_PASSWORD='test-password-only';process.env.DATA_DIR=await mkdtemp(join(tmpdir(),'tmc-test-'));
const {server}=await import('./server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const data={name:'Test Customer',phone:'081234567890',address:'Test Address 123',city:'Test City',postalCode:'12345',quantity:2,consent:true};
after(async()=>{await new Promise(r=>server.close(r));await rm(process.env.DATA_DIR,{recursive:true,force:true});});
test('store prices cannot be overridden and orders remain private',async()=>{
 const response=await fetch(base+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'test-order-00000001'},body:JSON.stringify({...data,subtotal:1})});assert.equal(response.status,201);const order=await response.json();assert.equal(order.subtotal,196000);
 const duplicate=await fetch(base+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'test-order-00000001'},body:JSON.stringify(data)});assert.equal((await duplicate.json()).id,order.id);
 assert.equal((await fetch(base+'/api/orders/'+order.id)).status,404);
 const lookup=await fetch(base+'/api/orders/'+order.id,{headers:{'X-Order-Token':order.token}});const safe=await lookup.json();assert.equal(safe.subtotal,196000);assert.equal(safe.address,undefined);
 assert.equal((await fetch(base+'/api/admin/orders')).status,401);
 const login=await fetch(base+'/api/admin/login',{method:'POST',body:JSON.stringify({password:'test-password-only'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const admin=await fetch(base+'/api/admin/orders',{headers:{cookie}});const orders=await admin.json();assert.equal(orders.orders.length,1);assert.equal(orders.orders[0].name,'Test Customer');assert.equal(orders.orders[0].token,undefined);
});
test('invalid addresses, quantity, origin, and source-code paths are rejected',async()=>{
 for(const invalid of [{...data,quantity:0},{...data,quantity:1.5},{...data,quantity:100},{...data,consent:false},{...data,postalCode:'x'}]){const r=await fetch(base+'/api/orders',{method:'POST',headers:{'Idempotency-Key':'test-invalid-0000001'},body:JSON.stringify(invalid)});assert.equal(r.status,400);}
 assert.equal((await fetch(base+'/api/orders',{method:'POST',headers:{Origin:'https://other.invalid'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/server.mjs')).status,404);
 assert.equal((await fetch(base+'/')).status,200);
 assert.equal((await fetch(base+'/assets/mockup.png')).headers.get('content-type'),'image/png');
});
