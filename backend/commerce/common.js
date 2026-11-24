"use strict";
class CommerceError extends Error {
  constructor(message, status=400) { super(message); this.status=status; }
}
const wrap = fn => async (req,res,next) => {
  try { await fn(req,res); } catch(e) {
    if(e instanceof CommerceError) return res.status(e.status).json({success:false,message:e.message});
    next(e);
  }
};
function number(value,min,max,name,integer=false) {
  if(value===null || value==='' || typeof value==='boolean' || !['number','string'].includes(typeof value)) throw new CommerceError(`Invalid ${name}`);
  const n=Number(value);
  if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n))) throw new CommerceError(`Invalid ${name}`);
  return n;
}
function text(value,max,name) {
  if(typeof value!=='string'||!value.trim()||value.trim().length>max) throw new CommerceError(`Invalid ${name}`);
  return value.trim();
}
const id = value => number(value,1,2147483647,'product ID',true);
const uuid = value => {
  if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new CommerceError('Invalid reservation key');
  return value.toLowerCase();
};
async function transaction(pool,fn) {
  const db=await pool.connect();
  try { await db.query('BEGIN'); const result=await fn(db); await db.query('COMMIT'); return result; }
  catch(e) { await db.query('ROLLBACK').catch(()=>{}); throw e; } finally { db.release(); }
}
module.exports={CommerceError,wrap,number,text,id,uuid,transaction};
