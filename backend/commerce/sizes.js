"use strict";
const {pool}=require('../db');
const {number,text,CommerceError}=require('./common');
const {cache}=require('./redis');
async function chart(brand) {
 const key=text(brand,80,'brand').toLowerCase();
 return cache(`shoes:chart:${key}`,60,async()=>{
  let rows=(await pool.query('SELECT * FROM shoes_size_charts WHERE brand=$1 ORDER BY foot_cm,eu',[key])).rows;
  if(!rows.length) rows=(await pool.query("SELECT * FROM shoes_size_charts WHERE brand='generic' ORDER BY foot_cm,eu")).rows;
  return rows.map(r=>({...r,eu:Number(r.eu),us:Number(r.us),uk:Number(r.uk),foot_cm:Number(r.foot_cm)}));
 });
}
function recommend(rows,cm) {
 cm=number(cm,15,40,'foot length');
 if(!rows.length||cm<rows[0].foot_cm-0.5||cm>rows.at(-1).foot_cm) return null;
 return rows.find(r=>r.foot_cm>=cm)||null;
}
async function savePreference(user,body) {
 const brand=text(body.brand,80,'brand').toLowerCase(),eu=number(body.eu,20,55,'EU size');
 const foot=body.footCm==null?null:number(body.footCm,15,40,'foot length');
 if(!['EU','US','UK'].includes(body.system)) throw new CommerceError('Choose EU, US or UK');
 const rows=await chart(brand);
 if(!rows.some(r=>r.eu===eu)) throw new CommerceError('Size not present in this chart');
 await pool.query(`INSERT INTO shoes_size_preferences(user_id,brand,eu,foot_cm,system) VALUES($1,$2,$3,$4,$5)
 ON CONFLICT(user_id,brand) DO UPDATE SET eu=EXCLUDED.eu,foot_cm=EXCLUDED.foot_cm,system=EXCLUDED.system,updated_at=NOW()`,[user,brand,eu,foot,body.system]);
}
module.exports={chart,recommend,savePreference};
