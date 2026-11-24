import { useEffect, useRef, useState } from 'react';
import { shoesAPI } from '../api';
import { useAuth } from '../auth/AuthContext';
import './commerce.css';
export default function SizeFinder({product,inventory,onSelect,onClose}) {
 const ref=useRef(null);const {user,getToken}=useAuth();
 const [chart,setChart]=useState([]),[cm,setCm]=useState(''),[system,setSystem]=useState('EU');
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{ref.current.showModal();},[]);
 useEffect(()=>{
  let active=true;
  async function load(){try{
   const result=await shoesAPI.sizeGuide(product.brand);
   if(active)setChart(result.chart);
   if(user){const token=await getToken();const saved=await shoesAPI.getSizes(token);const pref=saved.preferences.find(p=>p.brand===product.brand.toLowerCase());if(active&&pref){setCm(pref.foot_cm||'');setSystem(pref.system);}}
  }catch(e){if(active)setError(e.message);}}
  load();return()=>{active=false;};
 },[product.brand,user,getToken]);
 const recommended=cm&&chart.length&&Number(cm)>=chart[0].foot_cm-0.5?chart.find(r=>r.foot_cm>=Number(cm)):null;
 const isAvailable=eu=>!inventory?.managed||inventory.variants.some(v=>v.size===eu&&v.available>0);
 async function select(row,save){setBusy(true);setError('');try{
  if(save){const token=await getToken();await shoesAPI.saveSize({brand:product.brand,eu:row.eu,footCm:cm?Number(cm):null,system},token);setMessage('Preferred size saved to your account.');}
  if(isAvailable(row.eu))onSelect(row.eu);
  if(!save)onClose();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <dialog className="commerce-dialog" ref={ref} onCancel={onClose} onClick={e=>e.target===ref.current&&onClose()} aria-labelledby="size-guide-title">
  <div className="commerce-head"><h2 id="size-guide-title">Find your fit</h2><button type="button" onClick={onClose} aria-label="Close size guide">✕</button></div>
  <p>Measure both feet standing, heel to longest toe. Use the longer measurement.</p>
  <div className="commerce-fields"><label>Foot length (cm)<input type="number" min="15" max="40" step="0.1" value={cm} onChange={e=>setCm(e.target.value)} /></label>
  <label>Size system<select value={system} onChange={e=>setSystem(e.target.value)}>{['EU','US','UK'].map(s=><option key={s}>{s}</option>)}</select></label></div>
  {!chart.length&&!error&&<div className="skeleton commerce-skeleton" aria-label="Loading size chart"/>}
  {chart.length>0&&<p className="muted">{chart[0].brand==='generic'?'Approximate adult conversion. US sizes are men / unisex; fit varies by model.':`${product.brand} chart: ${chart[0].source}`}</p>}
  {recommended?<div className="commerce-recommend" aria-live="polite"><strong>Suggested {system} {recommended[system.toLowerCase()]}</strong><p>EU {recommended.eu} · US {recommended.us} · UK {recommended.uk}{!isAvailable(recommended.eu)&&' — currently unavailable'}</p>
   <button type="button" disabled={busy||!isAvailable(recommended.eu)} onClick={()=>select(recommended,false)}>Select size</button>{user&&<button type="button" disabled={busy} onClick={()=>select(recommended,true)}>Save preferred size</button>}</div>:cm&&<p role="status">No recommendation within this chart. Check your measurement or contact the store.</p>}
  {!user&&<p className="muted"><a href="/login">Sign in</a> to save your preferred size.</p>}
  <div className="commerce-table"><table><thead><tr><th>EU</th><th>US</th><th>UK</th><th>Foot cm</th><th>Availability</th></tr></thead><tbody>{chart.map(r=><tr key={r.eu} className={recommended?.eu===r.eu?'recommended':''}><td>{r.eu}</td><td>{r.us}</td><td>{r.uk}</td><td>{r.foot_cm}</td><td>{inventory?.managed?(isAvailable(r.eu)?'Available':'Unavailable'):'Not tracked by size'}</td></tr>)}</tbody></table></div>
  {error&&<p role="alert" className="form-error">{error}</p>}{message&&<p role="status">{message}</p>}
 </dialog>;
}
