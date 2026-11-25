import { useState } from 'react';

const programmes = [
  { type:'meeting', title:'Host a working meeting', layout:'CLASSROOM', setup:'Classroom', timing:'One meeting day uses three venue days: setup, meeting and takedown.', brief:'Give your coordinator the attendance, desk arrangement, presentation screen and microphone needs.' },
  { type:'exhibition', title:'Build an exhibition', layout:'UNDECIDED', setup:'Agree a floor plan', timing:'Reserve a minimum of seven venue days, even for a shorter public show.', brief:'Include booth count, build days, display screens and any security or booth-building support.' },
  { type:'conference', title:'Bring delegates together', layout:'THEATRE', setup:'Theatre', timing:'Share the plenary dates and any separate rehearsal or breakout sessions.', brief:'Estimate the largest simultaneous audience. List stage, audiovisual, registration and breakout needs.' },
];
export default function ProgrammeGuide({ onUse }) {
  const [index,setIndex] = useState(0);
  const item = programmes[index];
  return <section className="programme-guide" aria-labelledby="programme-heading">
    <div><p className="atlas-label">Organizer guide</p><h2 id="programme-heading">Build your event brief.</h2>
    <div className="programme-switch" aria-label="Event format" role="group">{programmes.map((entry,i) =>
      <button type="button" key={entry.type} aria-pressed={index===i} onClick={()=>setIndex(i)}>{entry.title}</button>)}</div></div>
    <article key={item.type}><h3>{item.title}</h3><dl><dt>Venue window</dt><dd>{item.timing}</dd><dt>Suggested seating</dt><dd>{item.setup}</dd><dt>What to tell your coordinator</dt><dd>{item.brief}</dd></dl>
    {onUse && <a href="#plan" onClick={()=>onUse(item)}>Use this event format ↑</a>}</article>
  </section>;
}
