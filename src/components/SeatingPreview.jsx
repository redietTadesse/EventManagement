import { useMemo, useRef, useState } from 'react';
import { ArrowPathIcon, CubeTransparentIcon, ViewfinderCircleIcon } from '@heroicons/react/24/outline';
import { SEATING, seatingCapacity } from '../utils/proposalBuilder';
import { seatingModel, projectRoom } from '../utils/seatingModel';
import { defaultTablePlaces, estimateTables, roundTableSizes, tableDistribution } from '../utils/tablePlan';
import usePlanningAppearance from '../hooks/usePlanningAppearance';

const descriptions = {
  THEATRE: 'Rows of chairs face the speaker. The centre aisle gives guests a way to their seats.',
  CLASSROOM: 'Guests sit behind desks facing the speaker, with space for laptops and notes.',
  BANQUET: 'Guests sit around all sides of each dining table.',
  CABARET: 'One side of each round table stays open so guests can see the stage.',
  BOARDROOM: 'One shared table brings everyone face to face for a discussion.',
  U_SHAPE: 'Tables form three sides of a U, leaving the centre open for the presenter.',
};

export function RoomDiagram({ layout, seatsPerTable, angle = 28, overhead = false }) {
  const name = SEATING.find(([key]) => key === layout)?.[1];
  const model = useMemo(() => seatingModel(layout, seatsPerTable), [layout, seatsPerTable]);
  const room = useMemo(() => projectRoom(model, angle, overhead), [model, angle, overhead]);
  if (!name) return null;
  return <svg viewBox={room.viewBox} role="img" aria-label={name + ' seating with a stage at the front'}>
    {room.faces.map((face, index) => <polygon key={index} points={face.points} fill={face.color} stroke={face.color} strokeWidth=".36" strokeLinejoin="round" />)}
    <text x={room.stage[0]} y={room.stage[1]} textAnchor="middle" dominantBaseline="middle" fontSize="6" fontWeight="700" fill="white">STAGE</text>
  </svg>;
}

export default function SeatingPreview({ setup, venue, guests, onChooseSetup, tablePlaces, onChangePlaces }) {
  const [angle, setAngle] = useState(28);
  const { appearance } = usePlanningAppearance();
  const [overhead, setOverhead] = useState(false);
  const [previewPlaces, setPreviewPlaces] = useState(defaultTablePlaces);
  const places = tablePlaces ?? previewPlaces;
  const drag = useRef(null);
  const example = !descriptions[setup];
  const layout = example ? 'THEATRE' : setup;
  const name = SEATING.find(([key]) => key === layout)[1];
  const capacity = seatingCapacity(venue, layout);
  const hasGuests = Number(guests) > 0;
  const sizes = roundTableSizes[layout];
  const estimate = sizes && estimateTables(guests, places[layout]);
  function rotate(event) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const degrees = drag.current.angle + (event.clientX - drag.current.x)*.65;
    setAngle(((Math.round(degrees / 2)*2 + 540) % 360 + 360) % 360 - 180);
  }

  return <figure className="seating-preview room-studio" data-appearance={appearance}>
    <figcaption><div><small><CubeTransparentIcon aria-hidden="true"/> Room planner</small><h3>{name}{example && ' example'}</h3></div>
      <div className="studio-tools">
        <button type="button" aria-pressed={overhead} onClick={() => setOverhead(!overhead)}><ViewfinderCircleIcon aria-hidden="true"/>View from above</button></div></figcaption>
    <div className="studio-stage" onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id:event.pointerId, x:event.clientX, angle };
    }} onPointerMove={rotate} onLostPointerCapture={() => { drag.current = null; }}>
      <RoomDiagram layout={layout} seatsPerTable={places[layout]} angle={angle} overhead={overhead} />
    </div>
    <div className="seating-controls"><label>Rotate room <input type="range" min="-180" max="180" step="2" value={angle} onChange={e => setAngle(Number(e.target.value))} /></label>
      <button type="button" onClick={() => { setAngle(28); setOverhead(false); }}><ArrowPathIcon aria-hidden="true"/>Reset view</button></div>
    <div className="studio-notes"><p>{descriptions[layout]}</p>
    {venue && !example && <p className={'seating-fit' + (capacity != null && guests > capacity ? ' is-short' : '')} role="status"><strong>{venue.name}</strong> · {capacity == null ? 'Capacity for this setup needs confirmation.' : hasGuests && guests > capacity ? `${capacity} seats · ${guests - capacity} fewer than requested.` : `${capacity} seats${hasGuests ? ' · fits your ' + Number(guests).toLocaleString() + ' guests' : ''}.`}</p>}
    {sizes && <div className="table-estimate"><label>Guests per table<select value={places[layout]} onChange={e => (onChangePlaces ?? setPreviewPlaces)({ ...places, [layout]:Number(e.target.value) })}>
      {sizes.map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <div role="status"><strong>{estimate ? estimate.tables.toLocaleString() + (estimate.tables === 1 ? ' table' : ' tables') : 'Table estimate'}</strong>
        <small>{estimate ? tableDistribution(estimate) + '. Estimated furniture for this guest count.' : 'Enter your guest count to estimate furniture.'}</small></div>
    </div>}
    {onChooseSetup && <details className="setup-alternatives"><summary>{venue && hasGuests ? `Which setups fit ${Number(guests).toLocaleString()} guests?` : 'Explore other seating arrangements'}</summary>
      <ul>{SEATING.map(([key,label]) => {
        const seats = seatingCapacity(venue,key);
        return <li key={key}><span>{label}</span><small>{!venue ? '' : seats == null ? 'Capacity unconfirmed' : seats + ' seats'}</small>
          {key === setup ? <strong>Selected</strong> : !venue || (seats != null && (!hasGuests || seats >= Number(guests))) ? <button type="button" onClick={() => onChooseSetup(key)}>Use {label.toLowerCase()}</button> : <small>{seats != null && 'Too small'}</small>}</li>;
      })}</ul></details>}
    <small>Sample layout. AICC confirms the final floor plan and furniture.</small></div>
  </figure>;
}
