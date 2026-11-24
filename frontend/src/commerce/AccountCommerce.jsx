import {useEffect,useState} from 'react';
import {shoesAPI} from '../api';
import {useAuth} from '../auth/AuthContext';
import {money} from '../lib/format';
import './commerce.css';
export default function AccountCommerce(){
 const {getToken}=useAuth();const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;async function load(){try{const token=await getToken();const [sizes,prices]=await Promise.all([shoesAPI.getSizes(token),shoesAPI.priceAlerts(token)]);if(active)setState({...prices,...sizes});}catch(e){if(active)setError(e.message);}}load();return()=>{active=false;};},[getToken]);
 async function remove(id){setBusy(true);try{const token=await getToken();await shoesAPI.unwatchPrice(id,token);setState(s=>({...s,alerts:s.alerts.map(a=>a.product_id===id?{...a,active:false}:a)}));}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="account-panel wide commerce-panel" id="smart-preferences"><h2>Your fit & price watch</h2>{!state&&!error&&<div className="skeleton commerce-skeleton"/>}
 {state&&<><h3>Preferred sizes</h3>{state.preferences.length?<ul>{state.preferences.map(p=><li key={p.brand}>{p.brand} · EU {p.eu}{p.foot_cm&&` · ${p.foot_cm} cm`} · display {p.system}</li>)}</ul>:<p>Use a product’s Size Guide to save your fit.</p>}
 <h3>Price alerts</h3>{state.alerts.filter(a=>a.active).length?<ul className="commerce-list">{state.alerts.filter(a=>a.active).map(a=><li key={a.id}><a href={`/product/${a.product_id}`}>{a.name}</a><span>Target {money(a.target_price)} · now {money(a.price)}</span><button disabled={busy} onClick={()=>remove(a.product_id)}>Remove alert</button></li>)}</ul>:<p>No active price alerts. Track a product from its price history panel.</p>}
 <h3>Recent price drops</h3>{state.notifications.length?<ul className="commerce-list">{state.notifications.map(n=><li key={n.id}><a href={`/product/${n.product_id}`}>{n.name}</a><span>{money(n.price)} · {new Date(n.created_at).toLocaleDateString('en-US')}</span><small>Email: {n.email_status.replaceAll('_',' ')}</small></li>)}</ul>:<p>No price drops yet.</p>}</>}
 {error&&<p role="alert" className="form-error">{error}</p>}</section>;
}
