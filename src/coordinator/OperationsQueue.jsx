import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import StatusBadge from '../components/StatusBadge';
import { formatEventDate } from './eventDetailModel';

const filters = [['all', 'All work'], ['urgent', 'Needs action'], ['inquiries', 'Inquiries'], ['waiting', 'Waiting for vendors']];
export default function OperationsQueue({ items, loading, incomplete }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [limit, setLimit] = useState(6);
  const matches = item => filter === 'all' || (filter === 'urgent' && item.priority === 0)
    || (filter === 'inquiries' && item.href.includes('/inquiries/')) || (filter === 'waiting' && item.status === 'AWAITING_VENDORS');
  const visible = items.filter(matches).filter(item => `${item.title} ${item.detail}`.toLowerCase().includes(search.toLowerCase()));
  const selected = visible.find(item => item.id === selectedId) || visible[0];
  return <section className="surface overflow-hidden" aria-labelledby="operations-queue-title">
    <div className="section-heading"><div><p className="eyebrow">Decisions & follow-up</p><h2 id="operations-queue-title">Your work queue</h2><p>Across coordinators · urgent items first. Open a record to check its owner.</p></div><span className="queue-count">{loading && !items.length ? '…' : items.length} items</span></div>
    <div className="queue-toolbar">
      <div className="flex flex-wrap gap-1" aria-label="Filter work">{filters.map(([key,label]) => <button key={key} type="button" aria-pressed={filter===key} onClick={()=>{setFilter(key);setLimit(6);}} className={'queue-filter '+(filter===key?'is-selected':'')}>{label}</button>)}</div>
      <label className="queue-search"><MagnifyingGlassIcon className="h-4 w-4"/><span className="sr-only">Search work</span><input value={search} onChange={event=>{setSearch(event.target.value);setLimit(6);}} placeholder="Find an event or request" type="search"/></label>
    </div>
    {(loading || incomplete) && <p role="status" className="px-6 py-3 text-sm text-amber-800">{incomplete?'Some sources could not be refreshed. Results may be incomplete.':'Refreshing the work queue…'}</p>}
    {selected ? <div className="queue-split"><div className="min-w-0">
      <ul className="queue-list">{visible.slice(0,limit).map(item=><li key={item.id}><button type="button" aria-controls="queue-preview" aria-pressed={item.id===selected.id} onClick={()=>setSelectedId(item.id)} className={'queue-row '+(item.id===selected.id?'is-selected':'')}>
        <span className={'queue-marker '+(item.priority===0?'is-urgent':'')} aria-hidden="true"/>
        <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{item.title || 'Untitled request'}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.detail}</span></span>
        <span className="shrink-0 text-xs text-slate-500">{item.priority===0?'Action needed':item.date?formatEventDate(item.date):'Review'}<ArrowRightIcon className="ml-auto mt-2 h-4 w-4"/></span>
      </button></li>)}</ul>
      {visible.length>limit && <button className="m-4 text-sm font-semibold text-indigo-700" onClick={()=>setLimit(value=>value+6)}>Show 6 more · {visible.length-limit} remaining</button>}
    </div><aside id="queue-preview" className="queue-preview" aria-live="polite"><p className="eyebrow">Selected work</p><h3>{selected.title || 'Untitled request'}</h3>{selected.status && <StatusBadge status={selected.status}/>}
      <dl className="mt-6 space-y-5 text-sm"><div><dt>Why it appears here</dt><dd>{selected.detail}</dd></div>{selected.date&&<div><dt>Event date</dt><dd>{formatEventDate(selected.date)}</dd></div>}<div><dt>Next step</dt><dd>{selected.priority===0?'Review the unresolved service and arrange an eligible vendor.':selected.status==='AWAITING_VENDORS'?'Check offer deadlines and responses before taking further action.':'Open the inquiry to review requirements and the latest client response.'}</dd></div></dl>
      <Link to={selected.href} className="btn-primary mt-7 w-full">{selected.action}<ArrowRightIcon className="h-4 w-4"/></Link>
    </aside></div>:<div className="flex items-start gap-4 p-8"><CheckCircleIcon className="h-6 w-6 shrink-0 text-indigo-600"/><div><h3 className="font-semibold">{loading?'Checking your work…':incomplete?'Work is temporarily unavailable':items.length?'No matching work':'No work waiting in this queue'}</h3><p className="mt-1 text-sm text-slate-500">{items.length?'Try another filter or search.':'New requests and service follow-ups appear here when they need attention.'}</p></div></div>}
  </section>;
}
