import {useState} from 'react';
import api from '../api/axios';
import useApiResource from '../hooks/useApiResource';
export default function InquiryBusinessDetails({inquiry,client=false}) {
  const history=useApiResource('/inquiries/'+inquiry.id+'/proposal-history');
  const [rating,setRating]=useState(inquiry.experience||'');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function rate(value){setBusy(true);setError('');try{await api.post('/inquiries/'+inquiry.id+'/experience',{experience:value});setRating(value);}catch{setError('Could not save your rating. Try again.');}finally{setBusy(false);}}
  return <section className="surface space-y-4 p-5">
    <h2 className="font-semibold">{inquiry.eventName || 'Event request'}</h2>
    {inquiry.unmetNeeds && <p className="rounded-lg bg-amber-50 p-3 text-sm">At submission: {inquiry.unmetNeeds}. Your request is saved for coordinator follow-up.</p>}
    <p className="text-sm">Proposal version {inquiry.proposalVersion||1}</p>
    {history.error && <p role="alert" className="text-sm text-rose-700">{history.error}</p>}
    {history.data.length>0&&<details><summary className="cursor-pointer text-sm font-medium">Earlier proposal versions ({history.data.length})</summary><div className="mt-3 space-y-3">{history.data.map(revision=>{let terms;try{terms=JSON.parse(revision.proposalJson);}catch{return null;}return <div key={revision.id} className="rounded-lg border p-3 text-sm"><p>Version {revision.revisionNumber} · {new Date(revision.createdAt).toLocaleString()}</p><p>{terms.eventName} · {terms.eventDate} · {terms.venue} · ETB {terms.price}</p><p>{terms.tableSetup?.replaceAll('_',' ')} · {terms.terms}</p></div>;})}</div></details>}
    {client&&<div className="border-t pt-4"><p className="text-sm font-medium">How was making this request? <span className="font-normal text-slate-500">Optional · one tap</span></p><div className="mt-2 flex gap-2">{[['GOOD','Good'],['OK','Okay'],['POOR','Poor']].map(([value,label])=><button type="button" key={value} aria-pressed={rating===value} disabled={busy} onClick={()=>rate(value)} className={'rounded-lg border px-4 py-2 text-sm '+(rating===value?'bg-indigo-600 text-white':'bg-white')}>{label}</button>)}</div>{rating&&<p role="status" className="mt-2 text-sm">Thank you. Your feedback was saved.</p>}{error&&<p role="alert">{error}</p>}</div>}
  </section>;
}
