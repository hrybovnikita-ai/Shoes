"use strict";
const Redis=require('ioredis');
let client;
function redis() {
 if(!process.env.REDIS_URL) return null;
 if(!client) {
  client=new Redis(process.env.REDIS_URL,{lazyConnect:true,maxRetriesPerRequest:1,connectTimeout:1500,commandTimeout:2000,enableOfflineQueue:false,retryStrategy:n=>Math.min(n*500,5000)});
  client.on('error',()=>{});
  client.connect().catch(()=>{});
 }
 return client;
}
async function cache(key,ttl,load) {
 const r=redis();
 if(r?.status==='ready') { try { const value=await r.get(key); if(value) return JSON.parse(value); } catch { /* PG remains authoritative */ } }
 const value=await load();
 if(r?.status==='ready') await r.set(key,JSON.stringify(value),'EX',ttl).catch(()=>{});
 return value;
}
async function close() { if(client) {client.disconnect();client=null;} }
module.exports={redis,cache,close};
