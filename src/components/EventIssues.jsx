import { useEffect, useState } from 'react';
import api from '../api/axios';
import useApiResource from '../hooks/useApiResource';

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const buttonClass = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50';
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const label = (value) => value.replace(/_/g, ' ').toLowerCase();

function IssueCard({ issue, staff, people, readOnly, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const resolved = issue.status === 'RESOLVED';

  useEffect(() => {
    setForm({
      priority: issue.priority, status: issue.status, responsibleUserId: issue.responsible.id,
      dueDate: issue.dueDate || '', resolutionNote: '',
    });
  }, [issue]);

  const save = async (event, action) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = action === 'note'
        ? await api.post(`/issues/${issue.id}/updates`, { note })
        : await api.put(`/issues/${issue.id}`, {
          ...form, version: issue.version, dueDate: form.dueDate || null,
          responsibleUserId: Number(form.responsibleUserId),
        });
      onChanged(response.data);
      setEditing(false);
      setNote('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this issue. Refresh and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{issue.title}</h3>
        <div className="flex gap-2 text-xs capitalize">
          <span className="rounded bg-slate-100 px-2 py-1">{label(issue.priority)}</span>
          <span className="rounded bg-indigo-50 px-2 py-1 text-indigo-700">{label(issue.status)}</span>
          {issue.overdue && <span className="rounded bg-rose-50 px-2 py-1 font-semibold text-rose-700">Overdue</span>}
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{issue.description}</p>
      <p className="text-sm text-slate-600">Responsible · {issue.responsible.name} · Due {issue.dueDate || 'Not set'}</p>
      <p className="text-xs text-slate-500">Reported by {issue.reportedBy.name} · {new Date(issue.createdAt).toLocaleString()}</p>
      {issue.assignmentId && <p className="text-sm text-slate-600">Vendor assignment #{issue.assignmentId} · {issue.vendorName}</p>}
      {issue.checklistId && <p className="text-sm text-slate-600">Preparation task · {issue.taskName}</p>}
      {resolved && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
        <p className="font-medium">Verified by {issue.resolvedBy?.name} · {new Date(issue.resolvedAt).toLocaleString()}</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{issue.resolutionNote}</p>
      </div>}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-indigo-700">Updates ({issue.updates.length})</summary>
        <ol className="mt-2 space-y-2">
          {issue.updates.map((update) => <li key={update.id} className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-500">{update.author.name} · {new Date(update.createdAt).toLocaleString()}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{update.note}</p>
          </li>)}
        </ol>
      </details>
      {staff && !resolved && <button type="button" className="text-sm font-medium text-indigo-700" onClick={() => setEditing(!editing)}>{editing ? 'Cancel changes' : 'Manage issue'}</button>}
      {editing && staff && !readOnly && <form onSubmit={(event) => save(event, 'edit')} className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Priority<select className={inputClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{priorities.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <label className="space-y-1 text-sm">Responsible person<select required className={inputClass} value={form.responsibleUserId} onChange={(event) => setForm({ ...form, responsibleUserId: event.target.value })}>
          {!people.some((person) => person.id === issue.responsible.id) && <option value={issue.responsible.id} disabled>{issue.responsible.name} (unavailable)</option>}
          {people.map((person) => <option key={person.id} value={person.id}>{person.name} · {label(person.role)}</option>)}
        </select></label>
        <label className="space-y-1 text-sm">Due date<input type="date" className={inputClass} value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        <label className="space-y-1 text-sm">Status<select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
          <option value={issue.status}>{label(issue.status)}</option>
          <option value={issue.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED'}>{issue.status === 'OPEN' ? 'In progress' : 'Resolved'}</option>
        </select></label>
        {form.status === 'RESOLVED' && <label className="space-y-1 text-sm sm:col-span-2">Verified resolution<textarea required maxLength={4000} className={inputClass} value={form.resolutionNote} onChange={(event) => setForm({ ...form, resolutionNote: event.target.value })} /></label>}
        <button disabled={saving} className={buttonClass}>{saving ? 'Saving…' : 'Save issue'}</button>
      </form>}
      {!resolved && !readOnly && <form onSubmit={(event) => save(event, 'note')} className="flex flex-col gap-2">
        <label className="space-y-1 text-sm">Progress update<textarea required maxLength={4000} className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe progress or the action needed" /></label>
        <div><button disabled={saving || !note.trim()} className={buttonClass}>{saving ? 'Saving…' : 'Add update'}</button></div>
      </form>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </article>
  );
}

export default function EventIssues({ eventId, assignmentId, assignments = [], tasks = [], staff = false, canReport = true, readOnly = false }) {
  const resource = useApiResource(`/events/${eventId}/issues`);
  const people = useApiResource(staff ? `/events/${eventId}/issue-responsibles` : null);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assignmentId: '', checklistId: '', responsibleUserId: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setItems(resource.data); }, [resource.data]);
  const visible = assignmentId ? items.filter((issue) => issue.assignmentId === Number(assignmentId)) : items;
  const outstanding = visible.filter((issue) => issue.status !== 'RESOLVED');
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const refresh = () => { resource.reload(); people.reload(); };
  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.post(`/events/${eventId}/issues`, {
        title: form.title, description: form.description, priority: form.priority,
        assignmentId: Number(assignmentId || form.assignmentId) || null,
        checklistId: Number(form.checklistId) || null,
        responsibleUserId: Number(form.responsibleUserId) || null, dueDate: form.dueDate || null,
      });
      setItems((previous) => [response.data, ...previous]);
      setForm({ title: '', description: '', priority: 'MEDIUM', assignmentId: '', checklistId: '', responsibleUserId: '', dueDate: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not report this issue.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="space-y-4" aria-label="Event issues">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Event issues</h2><p className="text-sm text-slate-500">{outstanding.length} unresolved · {outstanding.filter((issue) => issue.overdue).length} overdue</p></div>
      <div className="flex gap-3"><button type="button" onClick={refresh} className="text-sm text-indigo-700">Refresh issues</button>{canReport && <button type="button" onClick={() => setShowForm(!showForm)} className={buttonClass}>{showForm ? 'Cancel report' : 'Report an issue'}</button>}</div>
    </header>
    {showForm && canReport && !readOnly && <form onSubmit={create} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm sm:col-span-2">Issue title<input name="title" required maxLength={200} className={inputClass} value={form.title} onChange={change} /></label>
      <label className="space-y-1 text-sm sm:col-span-2">Description<textarea name="description" required maxLength={4000} className={inputClass} value={form.description} onChange={change} /></label>
      <label className="space-y-1 text-sm">Priority<select name="priority" className={inputClass} value={form.priority} onChange={change}>{priorities.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select></label>
      {staff && <>
        <label className="space-y-1 text-sm">Responsible person<select name="responsibleUserId" className={inputClass} value={form.responsibleUserId} onChange={change}><option value="">Assign to me</option>{people.data.map((person) => <option key={person.id} value={person.id}>{person.name} · {label(person.role)}</option>)}</select></label>
        <label className="space-y-1 text-sm">Due date<input name="dueDate" type="date" className={inputClass} value={form.dueDate} onChange={change} /></label>
        <label className="space-y-1 text-sm">Vendor assignment (optional)<select name="assignmentId" className={inputClass} value={form.assignmentId} onChange={change}><option value="">No assignment</option>{assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>#{assignment.id} · {assignment.vendorName || 'Open'} · {assignment.serviceCategory}</option>)}</select></label>
        <label className="space-y-1 text-sm">Preparation task (optional)<select name="checklistId" className={inputClass} value={form.checklistId} onChange={change}><option value="">No task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.itemName}</option>)}</select></label>
      </>}
      {!staff && <p className="text-sm text-slate-500">A coordinator will review your report, assign responsibility, and set a deadline.</p>}
      <div className="sm:col-span-2"><button disabled={saving} className={buttonClass}>{saving ? 'Reporting…' : 'Submit issue'}</button></div>
    </form>}
    {(resource.error || people.error || error) && <p role="alert" className="text-sm text-rose-700">{resource.error || people.error || error}</p>}
    {resource.loading ? <p>Loading issues…</p> : !resource.error && visible.length === 0 ? <p className="rounded-lg bg-white p-4 text-sm text-slate-500">No issues reported.</p> : visible.map((issue) => <IssueCard key={issue.id} issue={issue} staff={staff} readOnly={readOnly} people={people.data} onChanged={(updated) => setItems((previous) => previous.map((item) => item.id === updated.id ? updated : item))} />)}
  </section>;
}
