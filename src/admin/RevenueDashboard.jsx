import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useApiResource from '../hooks/useApiResource';

const etb = new Intl.NumberFormat('en', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthLabel = month => monthFormatter.format(new Date(month + '-01T00:00:00Z'));
const contractCount = count => count + (count === 1 ? ' contract' : ' contracts');
const eventLabel = label => label.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());

function PipelineCard({ title, amount, detail, dot }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <span aria-hidden="true" className={'h-2 w-2 rounded-full ' + dot} />{title}
      </h3>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{etb.format(amount.totalEtb)}</p>
      <p className="mt-2 text-sm text-slate-600">{contractCount(amount.contracts)} · {detail}</p>
    </div>
  );
}

function RevenueTrend({ monthly }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Monthly verified payments</h3>
      <p className="mt-1 text-sm text-slate-600">Grouped by the date the coordinator verified each receipt.</p>
      <div className="mt-5 h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tickFormatter={month => monthLabel(month).split(' ')[0]}
              axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis tickFormatter={value => compact.format(value)} allowDecimals={false}
              axisLine={false} tickLine={false} width={52} tick={{ fill: '#475569', fontSize: 12 }} />
            <Tooltip labelFormatter={monthLabel} formatter={value => [etb.format(value), 'Verified payments']}
              cursor={{ fill: '#eff6ff' }} />
            <Bar dataKey="totalEtb" fill="#4338ca" radius={[5, 5, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-4 border-t border-slate-200 pt-3 text-sm">
        <summary className="cursor-pointer font-medium text-indigo-700">View monthly figures</summary>
        <table className="mt-3 w-full text-left text-slate-700">
          <thead><tr className="border-b"><th scope="col" className="py-2">Month</th>
            <th scope="col" className="text-right">Verified payments</th><th scope="col" className="text-right">Contracts</th></tr></thead>
          <tbody>{monthly.map(row => <tr key={row.month} className="border-b border-slate-100">
            <th scope="row" className="py-2 font-normal">{monthLabel(row.month)}</th>
            <td className="text-right tabular-nums">{etb.format(row.totalEtb)}</td>
            <td className="text-right tabular-nums">{row.contracts}</td>
          </tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

function RevenueBreakdown({ byVenue, byEventType, total }) {
  const [group, setGroup] = useState('venue');
  const rows = group === 'venue' ? byVenue : byEventType;
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Payment breakdown</h3>
        <label className="text-sm text-slate-600">
          <span className="sr-only">Group payments by</span>
          <select value={group} onChange={event => setGroup(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5">
            <option value="venue">By venue</option>
            <option value="type">By event type</option>
          </select>
        </label>
      </div>
      <p className="mt-1 text-sm text-slate-600">Share of verified payments in this period.</p>
      {rows.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        No verified payments in this period.
      </p> : <ol className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
        {rows.map(row => {
          const share = row.totalEtb / total * 100;
          return <li key={row.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium text-slate-900">{group === 'type' ? eventLabel(row.label) : row.label}</span>
              <span className="font-semibold tabular-nums text-slate-900">{etb.format(row.totalEtb)}</span>
            </div>
            <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-indigo-50" aria-hidden="true">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: share + '%' }} />
            </div>
            <p className="text-xs text-slate-600">{contractCount(row.contracts)} · {share.toFixed(1)}% of total</p>
          </li>;
        })}
      </ol>}
    </section>
  );
}

export default function RevenueDashboard() {
  const [months, setMonths] = useState(6);
  const { data, loading, error, reload } = useApiResource('/admin/dashboard/revenue?months=' + months);
  const summary = data.monthly?.length === months ? data : null;

  return (
    <section className="space-y-5" aria-labelledby="revenue-title" aria-busy={loading}>
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Management overview</p>
            <h1 id="revenue-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Revenue and bookings</h1>
            <p className="mt-2 max-w-lg text-sm text-indigo-100">Track verified payments and see which signed contracts still need action.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="revenue-period">Revenue period</label>
            <select id="revenue-period" value={months} onChange={event => setMonths(Number(event.target.value))}
              className="rounded-lg border border-indigo-300/40 bg-indigo-950 px-3 py-2 text-sm text-white">
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            <button type="button" onClick={reload} disabled={loading}
              className="rounded-lg border border-indigo-300/40 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50">Refresh</button>
          </div>
        </div>
        <div className="mt-8 border-t border-indigo-300/30 pt-5">
          <p className="text-sm font-medium text-indigo-100">Gross verified payments</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {summary && !loading ? etb.format(summary.verified.totalEtb) : '—'}
          </p>
          {summary && !loading && <p className="mt-2 text-sm text-indigo-100">
            {contractCount(summary.verified.contracts)} · {monthLabel(summary.fromMonth)} to {monthLabel(summary.throughMonth)}
          </p>}
        </div>
      </div>
      {loading && <p role="status" className="rounded-2xl border bg-white p-5 text-sm text-slate-600">Loading revenue figures…</p>}
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}</p>}
      {summary && !loading && !error && <>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <RevenueTrend monthly={summary.monthly} />
          <RevenueBreakdown byVenue={summary.byVenue} byEventType={summary.byEventType} total={summary.verified.totalEtb} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Current payment pipeline</h3>
          <p className="mb-3 mt-1 text-sm text-slate-600">Signed contracts for all upcoming events, regardless of the revenue period above.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineCard title="Awaiting receipt" amount={summary.awaitingReceipt}
              detail="Client needs to submit or replace a receipt" dot="bg-amber-500" />
            <PipelineCard title="Awaiting review" amount={summary.awaitingReview}
              detail="Coordinator needs to verify payment" dot="bg-indigo-500" />
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          Verified totals use the agreed ETB amount and the verification date in Addis Ababa time.
          Figures are gross, before any refunds or costs.
        </p>
      </>}
    </section>
  );
}
