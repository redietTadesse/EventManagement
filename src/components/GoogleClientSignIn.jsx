import {useEffect,useRef,useState} from 'react';
import {authApi} from '../api/axios';
export default function GoogleClientSignIn({onSignedIn}){
  const button=useRef(null);const callback=useRef(onSignedIn);callback.current=onSignedIn;
  const [error,setError]=useState('');
  useEffect(()=>{let cancelled=false;let script;
    authApi.get('/auth/google/config').then(({data})=>{if(cancelled||!data.clientId)return;
      const nonce=crypto.randomUUID();
      function render(){if(cancelled||!window.google?.accounts?.id)return;
        window.google.accounts.id.initialize({client_id:data.clientId,nonce,auto_select:false,callback:async response=>{
          try{setError('');const result=await authApi.post('/auth/google',{credential:response.credential,nonce});await callback.current(result.data.accessToken);}
          catch(err){setError(err.response?.data?.message||'Could not sign in with Google. Try your username and password.');}
        }});window.google.accounts.id.renderButton(button.current,{theme:'outline',size:'large',text:'continue_with',width:280});}
      if(window.google?.accounts?.id)render();else{script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=render;script.onerror=()=>setError('Google sign-in is unavailable. You can use your username and password.');document.head.appendChild(script);}
    }).catch(()=>{});return()=>{cancelled=true;if(script)script.remove();};
  },[]);
  return <div className="mb-4"><div ref={button}/>{error&&<p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}</div>;
}
