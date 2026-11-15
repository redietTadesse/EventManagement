import {useEffect,useState} from 'react';
import api from '../api/axios';
export default function TentativeVenueRequests({start,end}){
 const [rows,setRows]=useState([]);const [error,setError]=useState('');
 useEffect(()=>{if(!start)return;const controller=new AbortController();
 Promise.all([api.get('/venues/tentative',{params:{start,end:end||start},signal:controller.signal}),api.get('/venues',{signal:controller.signal})])
 .then(([requests,venues])=>{setError('');setRows(requests.data.map(row=>({...row,name:venues.data.find(v=>v.id===row.venueId)?.name||'A venue'})));})
 .catch(err=>{if(!controller.signal.aborted)setError('Tentative requests could not be checked. Refresh before making a decision.');});return()=>controller.abort();},[start,end]);
 if(error)return <p role="alert" className="text-sm text-amber-800">{error}</p>;
 return rows.length>0&&<aside className="my-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Tentative requests — you may still continue</p><ul>{rows.map((row,i)=><li key={i}>{row.name}: {row.from} to {row.through}</li>)}</ul><p className="mt-2">These proposals are accepted but have no active contract hold. No other client details are shared.</p></aside>;
}
