import { useState } from 'react';
import { MAX_ATTENDEES } from '../utils/eventPlan';
import VenueLightField from './VenueLightField';
import { RoomDiagram } from './SeatingPreview';

const layouts = ['Theatre', 'Classroom', 'Banquet', 'Cabaret'];
// Published AICC room sheet. These figures describe capacity, not calendar availability.
const rooms = [
  ['Multipurpose I',4535,4200,1509,2400,1680], ['Multipurpose II',4205,4000,1548,2500,1750],
  ['Meeting Room 01',178.3,144,64,100,70], ['Meeting Room 02',214,168,68,100,70],
  ['Meeting Room 03',335,288,132,250,175], ['Meeting Room 04',250,189,88,140,98],
  ['Meeting Room 05',497,483,200,360,252], ['Meeting Room 06',313,264,132,200,140],
  ['Meeting Room 07',310,264,132,200,140], ['Meeting Room 08',935,716,376,620,434],
];
const descriptions = ['Forward-facing rows leave more floor space for guests.', 'Desks give participants space for notes and laptops.', 'Round tables seat guests on every side for a meal.', 'An open side at each table keeps the stage in view.'];

export function RoomAtlas({ onPlan }) {
  const [roomIndex,setRoom] = useState(0);
  const [layout,setLayout] = useState(0);
  const [angle, setAngle] = useState(28);
  const [guestInput, setGuestInput] = useState('');
  const guests = Number(guestInput);
  const validGuests = Number.isInteger(guests) && guests >= 1 && guests <= MAX_ATTENDEES;
  const room = rooms[roomIndex];
  const capacity = room[layout + 2];
  const fittingRooms = validGuests ? rooms.filter(candidate => candidate[layout + 2] >= guests)
    .sort((first, second) => first[layout + 2] - second[layout + 2]) : [];
  const smallest = fittingRooms[0];
  const otherLayouts = layouts.filter((_, index) => index !== layout && room[index + 2] >= guests);
  return <section id="atlas" className="atlas-section"><VenueLightField/><div className="atlas-inner">
    <div className="atlas-intro"><p className="atlas-label">Addis International Convention Center</p><h1>Room to<br/><em>gather.</em></h1>
      <p>Two halls. Eight meeting rooms. Choose your space and see how it works for your gathering in Addis Ababa.</p>
      <label>Explore a room<select value={roomIndex} onChange={e => setRoom(Number(e.target.value))}>{rooms.map(([name],i) => <option key={name} value={i}>{name}</option>)}</select></label>
      <div className="atlas-layouts" role="group" aria-label="Compare room layouts">{layouts.map((name,i) => <button key={name} aria-pressed={i===layout} onClick={() => setLayout(i)}>{name}</button>)}</div>
      <label className="atlas-guests">How many guests are coming?<input type="number" min="1" max={MAX_ATTENDEES} step="1" placeholder="Enter your guest estimate" value={guestInput} onChange={event => setGuestInput(event.target.value)}/></label>
      {guestInput && !validGuests && <p role="status">Enter a positive whole number up to {MAX_ATTENDEES.toLocaleString()}.</p>}
      {onPlan && (!guestInput || validGuests) && <a href="#plan" onClick={() => onPlan(room[0], layouts[layout].toUpperCase(), validGuests ? guests : null)}>Plan with this layout ↓</a>}
    </div>
    <figure className="atlas-drawing"><header><strong>{room[0]}</strong><span>{room[1].toLocaleString()} m²</span></header>
      <div className="atlas-model" key={layout}><RoomDiagram layout={layouts[layout].toUpperCase()} seatsPerTable={8} angle={angle}/></div>
      <label className="orbit-control">Rotate room<input type="range" min="-180" max="180" step="2" value={angle} onChange={e => setAngle(Number(e.target.value))}/></label>
      <figcaption aria-live="polite"><div><strong>{capacity.toLocaleString()}</strong><span>guest capacity</span></div><p>{descriptions[layout]}<small>Illustrative layout · AICC room specifications</small></p></figcaption>
      {validGuests && <div className="atlas-fit" aria-label="Capacity comparison">
        <p role="status"><strong>{capacity >= guests ? (capacity === guests ? 'Exact fit' : (capacity - guests).toLocaleString() + ' seats to spare') : (guests - capacity).toLocaleString() + ' seats short'}</strong> for {guests.toLocaleString()} guests in {layouts[layout].toLowerCase()} seating.</p>
        <div className="atlas-fill" aria-hidden="true"><i style={{width:Math.min(100, 100 * guests / capacity) + '%'}}/></div>
        {capacity < guests && otherLayouts.length > 0 && <div className="fit-options"><span>Keep this room</span>{otherLayouts.map(name => <button key={name} onClick={() => setLayout(layouts.indexOf(name))}>Try {name.toLowerCase()}</button>)}</div>}
        {smallest && smallest !== room && <button onClick={() => setRoom(rooms.indexOf(smallest))}>View smallest fit · {smallest[0]} ({smallest[layout + 2].toLocaleString()} seats) →</button>}
        <small>{fittingRooms.length} of {rooms.length} spaces fit this layout by capacity. Check your dates for availability.</small>
      </div>}
    </figure>
  </div></section>;
}

const resources = [
  ['Exhibitors','Trade fair venue guide','Explore an organizer’s account of the exhibition halls, outdoor event space and on-site facilities at AICC.','https://www.ethiopiafoodshow.com/about/the-venue/','Read the Ethiopia food show venue guide'],
  ['Organizers','Conference logistics guide','Explore a real delegate guide from the Africa Climate Summit, including the AICC site map.','https://africaclimatesummit2.et/static/assets/document/Logistics_note_Sept2_update3.pdf','Read the summit guide (PDF)'],
  ['Exhibitors','Exhibition preparations','See how HortiFlora organized exhibitor access, setup and breakdown for its 2026 show.','https://hppexhibitions.com/hfe/wp-content/uploads/2026/01/HortiFlora-Expo-2026-Exhibitor-Manual-Fillable.pdf','Read the exhibitor manual (PDF)'],
  ['Visitors','Getting to the center','Find the CMC roundabout entrance area and plan your journey across Addis Ababa.','https://www.google.com/maps/search/?api=1&query=Addis+International+Convention+Center%2C+Addis+Ababa','Open directions'],
  ['Organizers','Venue facilities','Review the convention center’s published profile in the international meetings directory.','https://portal.iccaworld.org/member-suppliers/detail/?id=18b7dac1-0a00-f111-8407-000d3a648fcc','View the ICCA profile'],
];
export function OrganizerLibrary() {
  const [filter,setFilter] = useState('All');
  return <section id="resources" className="organizer-library"><p className="atlas-label">Planning resources</p><h2>The organizer’s <em>bookshelf.</em></h2>
    <div className="library-filters" role="group" aria-label="Filter planning resources">{['All','Organizers','Exhibitors','Visitors'].map(name => <button key={name} aria-pressed={filter===name} onClick={() => setFilter(name)}>{name}</button>)}</div>
    <div className="library-grid">{resources.filter(([group]) => filter==='All' || filter===group).map(([group,title,detail,url,label]) => <article key={title}><small>{group}</small><h3>{title}</h3><p>{detail}</p><a href={url}>{label} ↗</a></article>)}</div>
  </section>;
}
