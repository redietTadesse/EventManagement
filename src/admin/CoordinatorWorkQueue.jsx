import { useState } from 'react';
import useApiResource from '../hooks/useApiResource';
import CoordinatorOwnership from '../components/CoordinatorOwnership';

export default function CoordinatorWorkQueue() {
  const work = useApiResource('/inquiries');
  const roster = useApiResource('/coordinators/workload');
  const [selected, setSelected] = useState('');
  const active = work.data.filter((inquiry) => ![
    'CANCELLED', 'COMPLETED', 'CLOSED', 'PROPOSAL_REJECTED',
  ].includes(inquiry.event?.status || inquiry.status));
  const current = active.find((inquiry) => String(inquiry.id) === selected);

  return <section className="space-y-4 rounded-xl border bg-white p-6">
    <div className="flex justify-between gap-3">
      <h2 className="font-semibold">Coordinator workload and handovers</h2>
      <button type="button" onClick={() => { work.reload(); roster.reload(); }} className="text-sm text-indigo-700">Refresh work</button>
    </div>
    {(work.loading || roster.loading) && <p>Loading work…</p>}
    {(work.error || roster.error) && <p role="alert" className="text-rose-700">{work.error || roster.error}</p>}
    <ul className="divide-y text-sm">
      {roster.data.map(({ coordinator, inquiries, events }) => <li key={coordinator.id} className="py-2">
        {coordinator.name}{!coordinator.active && ' (inactive)'} · {inquiries} active inquiries · {events} active events
      </li>)}
    </ul>
    <label className="block text-sm font-medium">
      Select an inquiry or event
      <select value={selected} onChange={(event) => setSelected(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
        <option value="">Select work to assign or reassign</option>
        {active.map((inquiry) => <option key={inquiry.id} value={inquiry.id}>
          #{inquiry.id} · {inquiry.event?.name || inquiry.clientName} · {inquiry.eventDate} · {inquiry.coordinator?.name || 'Unassigned'}
        </option>)}
      </select>
    </label>
    {current && <CoordinatorOwnership key={current.id} inquiryId={current.id}
      onChanged={() => { work.reload(); roster.reload(); }} />}
  </section>;
}
