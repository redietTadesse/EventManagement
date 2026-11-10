import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import useApiResource from '../hooks/useApiResource';
import api from '../api/axios';

export default function CoordinatorOwnership({ inquiryId, onChanged, closed = false }) {
  const { state } = useApp();
  const admin = state.currentUser?.role === 'ADMIN';
  const resource = useApiResource(`/inquiries/${inquiryId}/coordinator`);
  const roster = useApiResource(admin ? '/coordinators/workload' : null);
  const [ownership, setOwnership] = useState(null);
  const [coordinatorId, setCoordinatorId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOwnership(resource.data.version === undefined ? null : resource.data);
    setCoordinatorId(resource.data.coordinator?.id || '');
  }, [resource.data]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const path = `/inquiries/${inquiryId}/coordinator`;
      const response = admin
        ? await api.put(path, { coordinatorId: Number(coordinatorId), expectedVersion: ownership.version, reason })
        : await api.post(`${path}/claim`);
      setOwnership(response.data);
      setReason('');
      onChanged?.(response.data.coordinator);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the lead coordinator.');
      if (err.response?.status === 409) resource.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Lead coordinator</h2>
        <button type="button" onClick={resource.reload} className="text-sm text-indigo-700">Refresh assignment</button>
      </div>
      {resource.loading && <p className="text-sm">Loading assignment…</p>}
      {ownership && <p className="text-sm text-slate-700">
        Handled by {ownership.coordinator?.name || 'Unassigned'}
        {ownership.coordinator && !ownership.coordinator.active && ' (inactive account)'}
      </p>}
      {!admin && ownership && !closed && !ownership.coordinator && <p className="text-sm text-slate-600">Claiming makes you the lead coordinator. An administrator can reassign the work if needed.</p>}
      {ownership && !closed && (
        <form onSubmit={save} className="space-y-3">
          {admin && <>
            <label className="block text-sm">
              Coordinator
              <select required value={coordinatorId} onChange={(event) => setCoordinatorId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="">Select an active coordinator</option>
                {roster.data.filter((item) => item.coordinator.active).map((item) => (
                  <option key={item.coordinator.id} value={item.coordinator.id}>
                    {item.coordinator.name} · {item.inquiries} inquiries · {item.events} events
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Assignment or handover reason
              <textarea required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          </>}
          {(admin || !ownership.coordinator) && <button disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Saving…' : admin ? 'Assign coordinator' : 'Claim this work'}
          </button>}
        </form>
      )}
      {(resource.error || roster.error || error) && (
        <p role="alert" className="text-sm text-rose-700">{resource.error || roster.error || error}</p>
      )}
      {ownership?.history.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-indigo-700">Assignment history</summary>
          <ol className="mt-2 space-y-2">
            {ownership.history.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p>{item.previousCoordinatorName || 'Unassigned'} → {item.coordinatorName}</p>
              <p className="whitespace-pre-wrap break-words">{item.reason}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.changedByName} · {new Date(item.changedAt).toLocaleString()}
              </p>
            </li>)}
          </ol>
        </details>
      )}
    </section>
  );
}
