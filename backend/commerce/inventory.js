"use strict";
const crypto=require('node:crypto');
const {pool}=require('../db');
const {CommerceError,number,text,id,uuid,transaction}=require('./common');
const {redis}=require('./redis');
function normalize(items) {
 if(!Array.isArray(items)||!items.length||items.length>20) throw new CommerceError('Cart must contain 1–20 lines');
 const map=new Map();
 for(const i of items) {
  const row={id:id(i.id),size:number(i.size,20,55,'EU size'),color:text(i.color,40,'color'),quantity:number(i.quantity,1,10,'quantity',true)};
  const key=JSON.stringify([row.id,row.size,row.color.toLowerCase()]);
  if(map.has(key)) map.get(key).quantity+=row.quantity; else map.set(key,row);
  if(map.get(key).quantity>10) throw new CommerceError('Maximum 10 of each variant');
 }
 return [...map.values()].sort((a,b)=>a.id-b.id||a.size-b.size||a.color.localeCompare(b.color));
}
const fingerprint=items=>crypto.createHash('sha256').update(JSON.stringify(items.map(i=>({...i,color:i.color.toLowerCase()})))).digest('hex');
async function lockProducts(db,items) {
 return (await db.query('SELECT * FROM shoes_products WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[[...new Set(items.map(i=>i.id))]])).rows;
}
async function available(db,productId,exclude=null) {
 return (await db.query(`SELECT v.*, (v.stock-COALESCE((SELECT SUM(l.quantity) FROM shoes_reservation_lines l
 JOIN shoes_reservations r ON r.id=l.reservation_id WHERE l.variant_id=v.id AND r.status='active'
 AND r.expires_at>NOW() AND ($2::uuid IS NULL OR r.id<>$2)),0))::int AS available
 FROM shoes_variants v WHERE v.product_id=$1 ORDER BY v.size,v.color`,[productId,exclude])).rows;
}
async function validate(db,items,products,exclude=null) {
 const byId=new Map(products.map(p=>[p.id,p])); const grouped=new Map(); const allocations=[];
 for(const item of items) {
  const p=byId.get(item.id); if(!p) throw new CommerceError('Product no longer available',404);
  grouped.set(p.id,(grouped.get(p.id)||0)+item.quantity);
  if(p.inventory_managed) {
   const variants=await available(db,p.id,exclude);
   const v=variants.find(v=>Number(v.size)===item.size&&v.color.toLowerCase()===item.color.toLowerCase());
   if(!v||v.available<item.quantity) throw new CommerceError(`${p.name}, EU ${item.size}, ${item.color}: insufficient stock`,409);
   allocations.push({...item,variantId:v.id,color:v.color});
  } else {
   if(String(p.color).toLowerCase()!==item.color.toLowerCase()) throw new CommerceError('Color unavailable',409);
   allocations.push({...item,variantId:null});
  }
 }
 for(const [pid,quantity] of grouped) {
  const held=await db.query(`SELECT COALESCE(SUM((i->>'quantity')::int),0)::int AS n
   FROM shoes_reservations r, jsonb_array_elements(r.items) i WHERE r.status='active' AND r.expires_at>NOW()
   AND (i->>'id')::int=$1 AND ($2::uuid IS NULL OR r.id<>$2)`,[pid,exclude]);
  if(byId.get(pid).stock-held.rows[0].n<quantity) throw new CommerceError('Insufficient available stock',409);
 }
 return allocations;
}
function owns(r,userId) { return r && String(r.user_id||'')===String(userId||''); }
async function reserve(key,raw,userId) {
 uuid(key); const items=normalize(raw); const fp=fingerprint(items);
 const result=await transaction(pool,async db=>{
  // Same-key calls serialize before product locking, including different cart payloads.
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]);
  const old=(await db.query('SELECT * FROM shoes_reservations WHERE id=$1',[key])).rows[0];
  if(old) {
   if(!owns(old,userId)||old.fingerprint!==fp) throw new CommerceError('Reservation key already used',409);
   if(old.status!=='active'||new Date(old.expires_at)<=new Date()) throw new CommerceError('Reservation expired; reserve again',409);
   return old;
  }
  const products=await lockProducts(db,items);
  const allocations=await validate(db,items,products);
  const r=(await db.query(`INSERT INTO shoes_reservations(id,user_id,fingerprint,items,expires_at)
   VALUES($1,$2,$3,$4,NOW()+INTERVAL '10 minutes') RETURNING *`,[key,userId||null,fp,JSON.stringify(items)])).rows[0];
  for(const a of allocations) if(a.variantId) await db.query('INSERT INTO shoes_reservation_lines VALUES($1,$2,$3,$4)',[key,a.id,a.variantId,a.quantity]);
  return r;
 });
 const r=redis();
 if(r?.status==='ready') await r.set(`shoes:hold:${key}`,'1','PX',Math.max(1,new Date(result.expires_at)-Date.now())).catch(()=>{});
 return {id:result.id,expiresAt:result.expires_at};
}
async function release(key,userId) {
 uuid(key);
 await pool.query("UPDATE shoes_reservations SET status='released' WHERE id=$1 AND user_id IS NOT DISTINCT FROM $2::bigint AND status='active'",[key,userId||null]);
 const r=redis(); if(r?.status==='ready') await r.del(`shoes:hold:${key}`).catch(()=>{});
}
async function consume(db,key,raw,userId) {
 const items=normalize(raw);
 let reservation;
 if(key) {
  uuid(key);
  reservation=(await db.query('SELECT * FROM shoes_reservations WHERE id=$1 FOR UPDATE',[key])).rows[0];
  if(!owns(reservation,userId)||reservation.status!=='active'||new Date(reservation.expires_at)<=new Date()||reservation.fingerprint!==fingerprint(items)) throw new CommerceError('Reservation expired or does not match this cart',409);
 }
 const products=await lockProducts(db,items);
 const allocations=await validate(db,items,products,key||null);
 for(const a of allocations) if(a.variantId) {
  const changed=await db.query('UPDATE shoes_variants SET stock=stock-$2,version=version+1 WHERE id=$1 AND stock >= $2 RETURNING id',[a.variantId,a.quantity]);
  if(!changed.rowCount) throw new CommerceError('Stock changed; please try again',409);
 }
 if(key) await db.query("UPDATE shoes_reservations SET status='consumed' WHERE id=$1",[key]);
 return allocations;
}
async function restock(db,items) {
 await lockProducts(db,items);
 for(const i of items) if(i.variantId) await db.query('UPDATE shoes_variants SET stock=stock+$2,version=version+1 WHERE id=$1',[i.variantId,i.quantity]);
}
async function expire() {
 const result=await pool.query("UPDATE shoes_reservations SET status='expired' WHERE status='active' AND expires_at<=NOW() RETURNING id");
 return result.rowCount;
}
async function setVariant(productId,body) {
 const size=number(body.size,20,55,'EU size'),color=text(body.color,40,'color');
 const stock=number(body.stock,0,1000000,'stock',true);
 const version=number(body.version??0,0,2147483647,'version',true);
 return transaction(pool,async db=>{
  const p=(await lockProducts(db,[{id:productId}]))[0]; if(!p) throw new CommerceError('Product not found',404);
  // Changing allocation during any checkout or pending legacy payment is unsafe.
  const active=await db.query(`SELECT 1 FROM shoes_reservations r,jsonb_array_elements(r.items) i
    WHERE r.status='active' AND r.expires_at>NOW() AND (i->>'id')::int=$1 LIMIT 1`,[productId]);
  if(active.rowCount) throw new CommerceError('Active checkout reservations; retry after they finish',409);
  const variants=await available(db,productId);
  const old=variants.find(v=>Number(v.size)===size&&v.color.toLowerCase()===color.toLowerCase());
  if((old?.version||0)!==version) throw new CommerceError('Inventory changed; reload before saving',409);
  if(!p.inventory_managed) {
   const pending=await db.query(`SELECT 1 FROM shoes_orders o,jsonb_array_elements(o.items) i
    WHERE o.status='PENDING_PAYMENT' AND (i->>'id')::int=$1 LIMIT 1`,[productId]);
   if(pending.rowCount) throw new CommerceError('Finish pending legacy payments before assigning sizes',409);
  }
  const total=variants.reduce((sum,v)=>sum+v.stock,0)-(old?.stock||0)+stock;
  if(!p.inventory_managed && total>p.stock) throw new CommerceError('Allocation exceeds existing product stock',409);
  const row=(await db.query(`INSERT INTO shoes_variants(product_id,size,color,stock) VALUES($1,$2,$3,$4)
    ON CONFLICT(product_id,size,color) DO UPDATE SET stock=EXCLUDED.stock,version=shoes_variants.version+1 RETURNING *`,[productId,size,old?.color||color,stock])).rows[0];
  // Activation is explicit and requires exact allocation of the legacy count.
  if(body.activate===true&&!p.inventory_managed&&total!==p.stock) throw new CommerceError(`Allocate all ${p.stock} pairs before activation`,409);
  const managed=p.inventory_managed||body.activate===true;
  await db.query('UPDATE shoes_products SET inventory_managed=$2,stock=$3 WHERE id=$1',[productId,managed,managed?total:p.stock]);
  return row;
 });
}
module.exports={normalize,reserve,release,consume,restock,expire,available,setVariant,lockProducts,validate};
