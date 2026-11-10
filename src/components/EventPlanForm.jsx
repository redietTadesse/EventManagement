import { EVENT_TYPES, MAX_ATTENDEES, tomorrowDateKey } from '../utils/eventPlan';

const labelStyle = 'grid gap-1.5 text-sm font-semibold';

export default function EventPlanForm({ plan, dateRequired = false, className, onSearch, children }) {
  const earliestDate = tomorrowDateKey();

  return <form className={className}
    onSubmit={event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const end = event.currentTarget.elements.namedItem('endDate');
      if (end.value && (!values.get('date') || end.value < values.get('date'))) {
        end.setCustomValidity('Choose a start date on or before the end date.');
        end.reportValidity();
        return;
      }
      values.set('attendees', String(event.currentTarget.elements.namedItem('attendees').valueAsNumber));
      onSearch(new URLSearchParams([...values].filter(([, value]) => value)));
    }}
    onChange={event => event.currentTarget.elements.namedItem('endDate').setCustomValidity('')}>
    <label className={labelStyle}>
      Event type
      <select name="eventType" defaultValue={plan.eventType} className="w-full font-normal">
        {EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <label className={labelStyle}>
      Expected attendees
      <input name="attendees" type="number" min="1" max={MAX_ATTENDEES} defaultValue={plan.attendees}
        className="w-full font-normal" placeholder="e.g. 250" required />
    </label>
    <label className={labelStyle}>
      {dateRequired ? 'Start date' : 'Start date (optional)'}
      <input name="date" type="date" min={earliestDate} defaultValue={plan.date}
        className="w-full min-w-0 font-normal" required={dateRequired} />
    </label>
    <label className={labelStyle}>
      End date (optional)
      <input name="endDate" type="date" min={earliestDate} defaultValue={plan.endDate}
        className="w-full min-w-0 font-normal" />
    </label>
    {children}
  </form>;
}
