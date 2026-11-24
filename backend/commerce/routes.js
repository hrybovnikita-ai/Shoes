"use strict";
const router=require('express').Router();
const {pool}=require('../db');
const {requireAuth,optionalAuth}=require('../firebaseAdmin');
const requireAdmin=require('../middleware/requireAdmin');
const {rateLimit}=require('../lib/rateLimit');
const {wrap,id,number,text,CommerceError,transaction}=require('./common');
const inventory=require('./inventory');
const sizes=require('./sizes');
const search=require('./search');
const read=rateLimit({name:'commerce-read',windowMs:60000,max:240});
const write=rateLimit({name:'commerce-write',windowMs:60000,max:30});
router.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
router.get('/search',read,wrap(async(req,res)=>res.json({success:true,...await search.search(req.query)})));
router.get('/products/:id/inventory',read,wrap(async(req,res)=>{
 const productId=id(req.params.id);
 const p=(await pool.query('SELECT inventory_managed,stock,color FROM shoes_products WHERE id=$1',[productId])).rows[0];
 if(!p) throw new CommerceError('Product not found',404);
 const variants=await inventory.available(pool,productId);
 res.json({success:true,managed:p.inventory_managed,stock:p.stock,variants:variants.map(v=>({...v,size:Number(v.size)})),checkedAt:new Date().toISOString()});
}));
router.get('/size-guide',read,wrap(async(req,res)=>{
 const rows=await sizes.chart(req.query.brand||'generic');
 res.json({success:true,chart:rows,recommendation:req.query.footCm==null?null:sizes.recommend(rows,req.query.footCm)});
}));
router.get('/me/sizes',read,requireAuth,wrap(async(req,res)=>res.json({success:true,preferences:(await pool.query('SELECT brand,eu,foot_cm,system FROM shoes_size_preferences WHERE user_id=$1 ORDER BY brand',[req.user.id])).rows})));
router.put('/me/sizes',write,requireAuth,wrap(async(req,res)=>{await sizes.savePreference(req.user.id,req.body||{});res.json({success:true});}));
router.post('/reservations',write,optionalAuth,wrap(async(req,res)=>res.status(201).json({success:true,reservation:await inventory.reserve(req.body?.key,req.body?.items,req.user?.id)})));
router.delete('/reservations/:key',write,optionalAuth,wrap(async(req,res)=>{await inventory.release(req.params.key,req.user?.id);res.json({success:true});}));
router.get('/products/:id/prices',read,wrap(async(req,res)=>{
 const productId=id(req.params.id);
 const rows=(await pool.query('SELECT id,price,previous_price,recorded_at FROM shoes_price_history WHERE product_id=$1 ORDER BY recorded_at DESC,id DESC LIMIT 365',[productId])).rows.reverse();
 res.json({success:true,history:rows.map(r=>({...r,price:Number(r.price),previous_price:r.previous_price==null?null:Number(r.previous_price)}))});
}));
router.get('/me/price-alerts',read,requireAuth,wrap(async(req,res)=>{
 const alerts=(await pool.query(`SELECT a.*,p.name,p.price,p.image FROM shoes_price_alerts a JOIN shoes_products p ON p.id=a.product_id WHERE a.user_id=$1 ORDER BY a.id DESC LIMIT 200`,[req.user.id])).rows;
 const notifications=(await pool.query(`SELECT n.id,n.created_at,n.email_status,h.price,p.name,p.id AS product_id FROM shoes_price_notifications n
 JOIN shoes_price_alerts a ON a.id=n.alert_id JOIN shoes_price_history h ON h.id=n.history_id JOIN shoes_products p ON p.id=a.product_id
 WHERE a.user_id=$1 ORDER BY n.id DESC LIMIT 50`,[req.user.id])).rows;
 res.json({success:true,alerts,notifications});
}));
router.put('/me/price-alerts/:id',write,requireAuth,wrap(async(req,res)=>{
 const productId=id(req.params.id),target=number(req.body?.targetPrice,0.01,99999999,'target price');
 const p=(await pool.query('SELECT price FROM shoes_products WHERE id=$1',[productId])).rows[0];
 if(!p) throw new CommerceError('Product not found',404);
 if(target>=Number(p.price)) throw new CommerceError('Target must be below the current price');
 await pool.query(`INSERT INTO shoes_price_alerts(user_id,product_id,target_price) VALUES($1,$2,$3)
 ON CONFLICT(user_id,product_id) DO UPDATE SET target_price=EXCLUDED.target_price,active=TRUE,created_at=NOW()`,[req.user.id,productId,target]);
 res.json({success:true});
}));
router.delete('/me/price-alerts/:id',write,requireAuth,wrap(async(req,res)=>{
 await pool.query('UPDATE shoes_price_alerts SET active=FALSE WHERE user_id=$1 AND product_id=$2',[req.user.id,id(req.params.id)]);res.json({success:true});
}));
router.get('/admin/inventory',read,...requireAdmin,wrap(async(req,res)=>{
 const products=(await pool.query(`SELECT p.id,p.name,p.brand,p.stock,p.price,p.inventory_managed,
 COALESCE((SELECT jsonb_agg(v ORDER BY v.size,v.color) FROM shoes_variants v WHERE v.product_id=p.id),'[]') variants
 FROM shoes_products p ORDER BY p.id LIMIT 1000`)).rows;
 res.json({success:true,products});
}));
router.put('/admin/inventory/:id',write,...requireAdmin,wrap(async(req,res)=>res.json({success:true,variant:await inventory.setVariant(id(req.params.id),req.body||{})})));
router.put('/admin/products/:id/price',write,...requireAdmin,wrap(async(req,res)=>{
 const price=number(req.body?.price,0.01,99999999,'price'),expected=number(req.body?.expectedPrice,0,99999999,'previous price');
 const result=await pool.query('UPDATE shoes_products SET old_price=CASE WHEN price>$2 THEN price ELSE old_price END,price=$2 WHERE id=$1 AND price=$3 RETURNING id',[id(req.params.id),price,expected]);
 if(!result.rowCount) throw new CommerceError('Price changed or product missing; reload',409);
 res.json({success:true});
}));
router.put('/admin/size-charts/:brand',write,...requireAdmin,wrap(async(req,res)=>{
 const brand=text(req.params.brand,80,'brand').toLowerCase();
 const source=text(req.body?.source,500,'chart source');
 const rows=req.body?.rows;
 if(!Array.isArray(rows)||!rows.length||rows.length>80) throw new CommerceError('Supply 1–80 chart rows');
 const clean=rows.map(r=>({eu:number(r.eu,20,55,'EU'),us:number(r.us,0,25,'US'),uk:number(r.uk,0,25,'UK'),cm:number(r.footCm,15,40,'foot length')}));
 if(new Set(clean.map(r=>r.eu)).size!==clean.length) throw new CommerceError('Duplicate EU sizes');
 await transaction(pool,async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`chart:${brand}`]);
  await db.query('DELETE FROM shoes_size_charts WHERE brand=$1',[brand]);
  for(const r of clean) await db.query('INSERT INTO shoes_size_charts VALUES($1,$2,$3,$4,$5,$6)',[brand,r.eu,r.us,r.uk,r.cm,source]);
 });
 const redis=require('./redis').redis();if(redis?.status==='ready') await redis.del(`shoes:chart:${brand}`).catch(()=>{});
 res.json({success:true});
}));
module.exports=router;
