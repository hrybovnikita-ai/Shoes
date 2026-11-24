import { useEffect, useState } from 'react';
import { shoesAPI } from '../api';
export default function useInventory(productId) {
  const [state,setState]=useState({loading:true,data:null,error:''});
  useEffect(()=>{
    if(!productId) return;
    const controller=new AbortController(); let timer;
    async function refresh(){
      try {
        const data=await shoesAPI.inventory(productId,{signal:controller.signal});
        if(!controller.signal.aborted) setState({loading:false,data,error:''});
      } catch(e){if(!controller.signal.aborted)setState(s=>({...s,loading:false,error:e.message}));}
      if(!controller.signal.aborted)timer=setTimeout(refresh,5000);
    }
    refresh();
    const focus=()=>{clearTimeout(timer);refresh();};
    window.addEventListener('focus',focus);
    return ()=>{controller.abort();clearTimeout(timer);window.removeEventListener('focus',focus);};
  },[productId]);
  return state;
}
