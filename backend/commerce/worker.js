"use strict";
require('dotenv').config({quiet:true});
if(process.env.VERCEL) throw new Error('Run commerce workers on a persistent runtime, never Vercel functions');
if(!process.env.REDIS_URL) throw new Error('REDIS_URL is required for the commerce worker');
const {Queue,Worker}=require('bullmq');
const Redis=require('ioredis');
const {pool}=require('../db');
const {expire}=require('./inventory');
const search=require('./search');
const notifications=require('./notifications');
const log=require('../lib/logger');
const connection=new Redis(process.env.REDIS_URL,{maxRetriesPerRequest:null});
connection.on('error',()=>log.warn('commerce.redis_unavailable'));
const queue=new Queue('shoes-commerce',{connection});
const worker=new Worker('shoes-commerce',async job=>{
 if(job.name==='expire') return expire();
 if(job.name==='price-alert') return notifications.deliver(job.data.id);
 throw new Error('Unknown commerce job');
},{connection,concurrency:4});
worker.on('error',()=>log.error('commerce.worker_error'));
worker.on('failed',(job)=>log.warn('commerce.job_failed',{jobId:job?.id}));
let stopping=false,configured=false;
async function tick() {
 if(stopping) return;
 try {
  await expire(); // PostgreSQL expiry also recovers lost Redis delayed jobs.
  await notifications.discover();
  const pending=(await pool.query("SELECT id FROM shoes_price_notifications WHERE email_status='pending' ORDER BY id LIMIT 500")).rows;
  for(const n of pending) await queue.add('price-alert',{id:n.id},{jobId:`price-${n.id}`,attempts:8,backoff:{type:'exponential',delay:1000},removeOnComplete:{age:86400},removeOnFail:false});
  const holds=(await pool.query("SELECT id,expires_at FROM shoes_reservations WHERE status='active' ORDER BY expires_at LIMIT 500")).rows;
  for(const r of holds) await queue.add('expire',{}, {jobId:`expire-${r.id}`,delay:Math.max(0,new Date(r.expires_at)-Date.now()),attempts:5,backoff:{type:'exponential',delay:1000},removeOnComplete:{age:3600}});
  if(process.env.MEILI_HOST) {if(!configured){await search.configure();configured=true;} await search.sync();}
 } catch { log.warn('commerce.tick_failed'); }
 if(!stopping) timer=setTimeout(tick,3000);
}
let timer;
tick();
async function shutdown(){stopping=true;clearTimeout(timer);await worker.close();await queue.close();await connection.quit();await pool.end();await require('./redis').close();}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
