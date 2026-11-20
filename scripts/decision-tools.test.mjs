import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

// Real components, a DOM and a fake HTTP transport. No test writes to AICC's server.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5174', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'FormData', 'HTMLElement', 'HTMLIFrameElement', 'HTMLButtonElement', 'HTMLFieldSetElement', 'HTMLLegendElement', 'HTMLInputElement', 'SVGElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'getComputedStyle', 'localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key] });
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);
globalThis.removeEventListener = dom.window.removeEventListener.bind(dom.window);
// jsdom has no layout engine; resize observations are outside these interaction checks.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.scrollTo = () => {};
const React = await import('react');
const { render, screen, cleanup, within, waitFor } = await import('@testing-library/react');
const { default: userEvent } = await import('@testing-library/user-event');
const directory = resolve('output/verification/tests');
const bundle = resolve(directory, 'decision-components-' + process.pid + '.mjs');
await mkdir(directory, { recursive: true });
const result = await build({ stdin: { contents: `
 export { default as Composer } from './src/components/ProposalComposer.jsx';
 export { default as Recovery } from './src/components/VendorRecoveryDesk.jsx';
 export { default as ClientVenues } from './src/client/ClientVenues.jsx';
 export { default as InquiryDetail } from './src/coordinator/InquiryDetail.jsx';
 export { default as BookingChecks } from './src/components/ConversionPreviewModal.jsx';
 export { default as App } from './src/App.jsx';
 export { AppProvider } from './src/context/AppContext.jsx';
 export { ToastProvider } from './src/context/ToastContext.jsx';
 export { default as api, authApi } from './src/api/axios.js';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', define: { 'import.meta.env': '{}' } });
await writeFile(bundle, result.outputFiles[0].text);
const { Composer, Recovery, ClientVenues, InquiryDetail, BookingChecks, AppProvider, ToastProvider, App, api, authApi } = await import(pathToFileURL(bundle));
const { BrowserRouter, MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const h = React.createElement;
const nextYear = new Date().getFullYear() + 1;
const date = nextYear + '-06-15';
const venues = [
  { id: 12, name: 'Room A', capacity: 300, layoutCapacities: '{"THEATRE":300,"CLASSROOM":132}', setupBufferDays: 1, teardownBufferDays: 1 },
  { id: 14, name: 'Room B', capacity: 450, layoutCapacities: '{"THEATRE":450,"CLASSROOM":200}', setupBufferDays: 1, teardownBufferDays: 1 },
];
const proposal = { venueId: 12, venue: 'Room A', eventName: 'Forum', eventDate: date, expectedAttendees: 100, tableSetup: 'CLASSROOM', price: 6000, terms: 'Agreed test terms.', categories: [], vendorShortlist: {} };
const inquiry = { id: 17, clientName: 'Test client', eventName: 'Forum', eventDate: date, eventType: 'meeting', tableSetup: 'CLASSROOM', expectedAttendees: 100, requestedCategories: ['av'], proposalVersion: 3, proposal: JSON.stringify(proposal) };
let sent = [];
let failAvailability = false;
api.defaults.adapter = async config => {
  let data = [];
  if (config.url === '/inquiries/17') data = { ...inquiry, proposal: null, status: 'INQUIRY_SUBMITTED' };
  if (config.url === '/vendors/service-categories') data = ['av', 'security'];
  if (config.url.startsWith('/venues/available')) {
    if (failAvailability) throw new Error('Test connection failure');
    const query = new URLSearchParams(config.url.split('?')[1]);
    const setup = config.params?.tableSetup || query.get('tableSetup');
    const attendees = config.params?.attendees || query.get('attendees');
    data = venues.map(venue => ({ ...venue, active: true })).filter(venue => JSON.parse(venue.layoutCapacities)[setup] >= Number(attendees));
  }
  if (config.url.includes('/vendor-suggestions/')) data = [];
  if (config.url.endsWith('/proposal')) { sent.push(JSON.parse(config.data)); data = { id: 17, status: 'PROPOSAL_SENT' }; }
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
const mountComposer = () => render(h(BrowserRouter, null, h(ToastProvider, null, h(AppProvider, null, h(Composer, { inquiry, editMode: true, onCancel() {}, onSuccess() {} })))));
const componentAdapter = api.defaults.adapter;
afterEach(() => { cleanup(); sent = []; failAvailability = false; api.defaults.adapter = componentAdapter; localStorage.clear(); });
test.after(async () => { await rm(bundle, { force: true }); dom.window.close(); });

test('proposal builder compares actual seating capacities and sends the reviewed, intentionally empty package', async () => {
  const user = userEvent.setup();
  mountComposer();
  await screen.findAllByRole('heading', { name: 'Room A', level: 4 });
  const cards = ['Room A', 'Room B'].map(name => screen.getAllByRole('heading', { name, level: 4 }).map(node => node.closest('article')).find(Boolean));
  await user.click(within(cards[0]).getByRole('checkbox', { name: 'Compare' }));
  await user.click(within(cards[1]).getByRole('checkbox', { name: 'Compare' }));
  await user.click(screen.getByRole('button', { name: /Compare selected rooms/ }));
  const dialog = screen.getByRole('dialog');
  assert.ok(within(dialog).getByText('132'));
  assert.ok(within(dialog).getByText('200'));
  await user.click(within(dialog).getAllByRole('button', { name: 'Use this room' })[1]);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  assert.equal(screen.getByRole('checkbox', { name: 'Audiovisual' }).checked, false);
  assert.ok(screen.getByRole('heading', { name: 'Venue-only proposal' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  assert.equal(sent.length, 0);
  await user.click(screen.getByRole('button', { name: 'Send revised proposal' }));
  await waitFor(() => assert.equal(sent.length, 1));
  assert.equal(sent[0].venueId, 14);
  assert.deepEqual(sent[0].categories, []);
  assert.equal(sent[0].expectedVersion, 3);
  assert.equal(JSON.parse(sent[0].venueDetails).capacity, 200);
});

test('editing attendance invalidates the old room selection and blocks sending after a failed availability refresh', async () => {
  const user = userEvent.setup();
  mountComposer();
  await screen.findAllByRole('heading', { name: 'Room A', level: 4 });
  failAvailability = true;
  await user.clear(screen.getByRole('spinbutton', { name: 'Expected guests' }));
  await user.type(screen.getByRole('spinbutton', { name: 'Expected guests' }), '180');
  await user.click(screen.getByRole('button', { name: /Review & send/ }));
  await screen.findByText('Check venue availability before sending.');
  assert.equal(screen.getByRole('button', { name: 'Send revised proposal' }).disabled, true);
  assert.equal(sent.length, 0);
});

test('a visitor carries venue search criteria through client sign-in', async () => {
  const user = userEvent.setup();
  const oldAuth = authApi.defaults.adapter;
  authApi.defaults.adapter = async config => ({ status:200, headers:{}, config,
    data:config.url === '/auth/login' ? {accessToken:'local-ui-fixture', role:'CLIENT'} : {} });
  api.defaults.adapter = async config => ({status:200, headers:{}, config,
    data:config.url === '/users/me' ? {id:4, role:'CLIENT'} : config.url === '/notifications' ? {items:[], unreadCount:0} : [] });
  try {
    window.history.replaceState({}, '', '/');
    render(h(App));
    await user.type(screen.getByLabelText('Expected attendees'), '140');
    await user.selectOptions(screen.getByLabelText('Seating setup'), 'CLASSROOM');
    await user.click(screen.getByRole('button', {name:'Find venues'}));
    assert.equal(window.location.pathname, '/login/client');
    await user.type(await screen.findByLabelText('Username'), 'democlient');
    await user.type(screen.getByLabelText('Password'), 'fixture-only');
    await user.click(screen.getByRole('button', {name:/^sign in$/i}));
    await waitFor(() => assert.equal(window.location.pathname, '/client/venues'));
    const query = new URLSearchParams(window.location.search);
    assert.equal(query.get('attendees'), '140');
    assert.equal(query.get('tableSetup'), 'CLASSROOM');
  } finally { authApi.defaults.adapter = oldAuth; }
});

test('the sign-in page shows all four portals and loads Google only on the client portal', async () => {
  const oldAuth = authApi.defaults.adapter;
  const requests = [];
  authApi.defaults.adapter = async config => {
    requests.push(config.url);
    return { status:200, headers:{}, config, data:{ clientId:'' } };
  };
  try {
    window.history.replaceState({}, '', '/login/vendor');
    render(h(App));
    const portals = screen.getByRole('navigation', { name:'Sign-in portals' });
    assert.equal(within(portals).getAllByRole('link').length, 4);
    assert.equal(within(portals).getByRole('link', {name:'Vendor'}).getAttribute('aria-current'), 'page');
    assert.equal(requests.length, 0);
    const clientRoute = within(portals).getByRole('link', {name:'Client'}).getAttribute('href');
    const adminRoute = within(portals).getByRole('link', {name:'Administrator'}).getAttribute('href');
    cleanup();
    window.history.replaceState({}, '', clientRoute);
    render(h(App));
    await screen.findByText(/Google sign-in is unavailable/);
    assert.deepEqual(requests, ['/auth/google/config']);
    cleanup();
    window.history.replaceState({}, '', adminRoute);
    render(h(App));
    assert.equal(screen.queryByLabelText('Google sign-in'), null);
  } finally { authApi.defaults.adapter = oldAuth; }
});

function openWorkspace(role, data, path = '/' + role.toLowerCase() + '/dashboard', onWrite) {
  const currentUser = { id: 4, role, fullName: 'Demo user' };
  const fixtures = { '/users/me': currentUser, '/notifications': { items: [], unreadCount: 0 }, ...data };
  api.defaults.adapter = async config => {
    if (config.method !== 'get') {
      assert.ok(onWrite, 'unexpected write');
      return { data: onWrite(config), status:200, headers:{}, config };
    }
    const result = fixtures[config.url];
    return { data: structuredClone(result ?? []), status: 200, statusText: 'OK', headers: {}, config };
  };
  localStorage.setItem('token', 'local-ui-fixture');
  window.history.replaceState({}, '', path);
  render(h(App));
}

test('vendor Fayda callback consumes the matching browser attempt once', async () => {
  sessionStorage.setItem('aicc.fayda.sandbox', JSON.stringify({state:'matched', ticket:'signed-ticket'}));
  const writes = [];
  openWorkspace('VENDOR', {}, '/vendor/fayda/callback?state=matched&code=example-code', config => {
    writes.push([config.url, JSON.parse(config.data)]);
    return { verifiedAt:'2026-11-19T13:00:00Z' };
  });
  await screen.findByText('Your sandbox check is recorded.');
  assert.deepEqual(writes, [['/vendors/me/fayda/complete', {state:'matched',ticket:'signed-ticket',code:'example-code'}]]);
  assert.equal(sessionStorage.getItem('aicc.fayda.sandbox'), null);
  assert.equal(window.location.search, '');
});

test('vendor Fayda callback rejects a mismatched state with no provider exchange', async () => {
  sessionStorage.setItem('aicc.fayda.sandbox', JSON.stringify({state:'expected', ticket:'signed-ticket'}));
  let writes = 0;
  openWorkspace('VENDOR', {}, '/vendor/fayda/callback?state=wrong&code=example-code', () => { writes++; return {}; });
  await screen.findByText(/The check did not finish/);
  assert.equal(writes, 0);
});

test('the coordinator follows two overlapping proposals to their room and sees the actual hold on the shared day', async () => {
  const user = userEvent.setup();
  const later = nextYear + '-06-17';
  const shared = nextYear + '-06-16';
  const requests = [
    { ...inquiry, eventName: 'Forum', proposal: { venueId: 12 }, status: 'PROPOSAL_SENT' },
    { ...inquiry, id: 18, eventName: 'Assembly', proposal: { venueId: 12 }, eventDate: later, status: 'PROPOSAL_ACCEPTED' },
  ];
  openWorkspace('COORDINATOR', { '/inquiries': requests, '/venues': venues.map(v => ({ ...v, active: true })),
    '/venues/12/bookings': [{ bookingDate: shared, status: 'HELD', expiresAt: nextYear + '-12-30T00:00:00Z' }] });
  assert.ok(await screen.findByRole('link', { name: /Forum/ }));
  await user.click(screen.getByRole('tab', { name: 'Competing proposals' }));
  await user.click(await screen.findByRole('link', { name: /Check schedule/ }));
  const comparison = await screen.findByRole('region', { name: 'Proposals being compared' });
  assert.ok(within(comparison).getByRole('link', { name:'Assembly' }));
  await user.click(await screen.findByRole('button', { name:'Room A, ' + shared + ', Held, two proposals' }));
  assert.equal(screen.getByLabelText('Start date').value, shared);
  assert.equal(screen.queryByRole('link', {name:'Room B'}), null);
});

test('the client sees the receipt decision, opens the agreement, and finds the converted event once in history', async () => {
  const user = userEvent.setup();
  openWorkspace('CLIENT', {
    '/inquiries/client/4': [
      { ...inquiry, clientId:4, status:'PROPOSAL_ACCEPTED' },
      { id:18, clientId:4, status:'EVENT_CREATED', event:{ id:41, name:'Assembly', status:'COMPLETED' } },
    ],
    '/events': [{ id:41, inquiryId:18, name:'Assembly', status:'COMPLETED', eventDate:date }],
    '/inquiries/17': { ...inquiry, clientId:4, status:'PROPOSAL_ACCEPTED' },
    '/inquiries/17/booking-agreement': { state:'AWAITING_REVIEW', client:true, clientSignature:'Demo client', coordinatorSignature:'Demo coordinator',
      terms:{proposalNumber:'P-17', eventName:'Forum', totalEtb:6000, eventDate:date, endDate:date, venue:'Room A', services:['av']} },
    '/inquiries/17/timeline': {inquirySubmitted:true, proposalSent:true, venueHeld:false},
  });
  assert.ok(await screen.findByText('Your receipt is with AICC'));
  await user.click(screen.getByRole('button', { name: 'Past 1' }));
  assert.ok(screen.getByRole('heading', {name: 'Your event is complete'}));
  assert.equal(screen.getByRole('link', {name:'Open event'}).getAttribute('href'), '/client/events/41');
  await user.click(screen.getByRole('button', {name:'Active 1'}));
  await user.click(screen.getByRole('link', {name:'Open agreement'}));
  await waitFor(() => assert.equal(document.activeElement.id, 'client-agreement'));
  let printed = '';
  const originalPrint = window.print;
  window.print = () => {
    printed = document.querySelector('body > .aicc-contract-copy').textContent;
    window.dispatchEvent(new window.Event('afterprint'));
  };
  try { await user.click(await screen.findByRole('button', {name:'Print agreement'})); }
  finally { window.print = originalPrint; }
  assert.match(printed, /P-17/);
  assert.match(printed, /ETB 6,000/);
  assert.match(printed, /Demo client/);
  assert.match(printed, /Demo coordinator/);
  assert.equal(document.querySelector('.aicc-contract-copy'), null);
});

test('the vendor can switch from the earliest offer to a booked commitment and open its assignment', async () => {
  const user = userEvent.setup();
  const assignment = { id:77, eventName:'Service day', status:'ACCEPTED', eventDate:date, serviceCategory:'security' };
  openWorkspace('VENDOR', { '/vendors/me': {companyName:'Test services'},
    '/assignments/me': [assignment, {id:78, eventName:'Late deadline', status:'PENDING', expiresAt:nextYear+'-04-02'},
      {id:79, eventName:'First deadline', status:'PENDING', expiresAt:nextYear+'-04-01'}],
    '/assignments/me/77': assignment });
  assert.ok(await screen.findByRole('heading',{name:'First deadline'}));
  await user.click(screen.getByRole('button',{name:'Upcoming 1'}));
  await user.click(screen.getByRole('link',{name:'Open assignment'}));
  assert.ok(await screen.findByRole('heading',{name:'Service day'}));
  assert.equal(window.location.pathname, '/vendor/assignments/77');
  let printed = '';
  const originalPrint = window.print;
  window.print = () => {
    printed = document.querySelector('body > .crew-print').textContent;
    window.dispatchEvent(new window.Event('afterprint'));
  };
  try { await user.click(screen.getByRole('button', { name: 'Print crew brief' })); }
  finally { window.print = originalPrint; }
  assert.match(printed, /Service day/);
  assert.match(printed, /Security/);
  assert.equal(document.querySelector('.crew-print'), null);
});

test('a manager can change the revenue period and keep the same figures in the detailed report', async () => {
  const user = userEvent.setup();
  function report(months) {
    const monthly = Array.from({length:months}, (_,i) => ({month:'2026-' + String(i+1).padStart(2,'0'),totalEtb:1000,contracts:1}));
    return { monthly, fromMonth:monthly[0].month, throughMonth:monthly.at(-1).month, verified:{ totalEtb:months*1000, contracts:months },
      awaitingReceipt:{totalEtb:450,contracts:1}, awaitingReview:{totalEtb:600,contracts:1}, byVenue:[], byEventType:[] };
  }
  openWorkspace('ADMIN', { '/admin/dashboard/revenue?months=3':report(3), '/admin/dashboard/revenue?months=12':report(12) });
  await user.selectOptions(await screen.findByRole('combobox',{name:'Reporting period'}), '12');
  await screen.findByText(/12 verified contracts/);
  await user.click(screen.getByRole('button',{name:/View payment breakdown/}));
  assert.equal((await screen.findByLabelText('Revenue period')).value, '12');
  assert.ok(await screen.findByText(/12 contracts ·/));
});

test('vendor recovery requires an explicit choice and review, then addresses the chosen vendor', async () => {
  const user = userEvent.setup();
  const calls = [];
  render(h(Recovery, { isOpen: true, onClose() {}, onAssign: (...args) => calls.push(args), serviceCategory: 'av', eventName: 'Forum', availableVendors: [
    { id: 51, companyName: 'First candidate', score: 90, rank: 1, qualityScore: 90, workloadScore: 90, rotationScore: 90 },
    { id: 82, companyName: 'Chosen candidate', score: 80, rank: 2, qualityScore: 80, workloadScore: 80, rotationScore: 80 },
  ] }));
  assert.equal(screen.getByRole('button', { name: 'Review replacement offer' }).disabled, true);
  await user.click(screen.getByRole('button', { name: /Chosen candidate/ }));
  await user.type(screen.getByRole('textbox', { name: /Why are you choosing/ }), 'Equipment checked by phone.');
  await user.click(screen.getByRole('button', { name: 'Review replacement offer' }));
  assert.equal(calls.length, 0);
  assert.ok(screen.getByRole('heading', { name: 'Chosen candidate' }));
  await user.click(screen.getByRole('button', { name: 'Send pending offer' }));
  assert.deepEqual(calls, [['82', 'Equipment checked by phone.']]);
});

test('a client compares seating-specific capacity and carries the chosen venue and requirements into an inquiry', async () => {
  const user = userEvent.setup();
  function LocationProbe() { const location = useLocation(); return h('p', { 'data-testid': 'location' }, location.pathname + location.search); }
  render(h(MemoryRouter, { initialEntries: ['/client/venues?date=' + date + '&eventType=meeting&attendees=100&tableSetup=CLASSROOM'] }, h(ToastProvider, null, h(AppProvider, null, h(ClientVenues), h(LocationProbe)))));
  await screen.findByRole('heading', { name: 'Room A' });
  const selections = screen.getAllByRole('checkbox', { name: 'Compare this space' });
  await user.click(selections[0]);
  await user.click(selections[1]);
  await user.click(screen.getByRole('button', { name: 'Compare spaces' }));
  const dialog = screen.getByRole('dialog');
  assert.ok(within(dialog).getByText('132'));
  assert.ok(within(dialog).getByText('200'));
  await user.click(within(dialog).getAllByRole('button', { name: 'Continue with this space' })[1]);
  await waitFor(() => {
    const location = screen.getByTestId('location').textContent;
    assert.ok(location.startsWith('/client/new-inquiry?'));
    const query = new URLSearchParams(location.split('?')[1]);
    assert.equal(query.get('preferredVenue'), 'Room B');
    assert.equal(query.get('preferredVenueId'), '14');
    assert.equal(query.get('tableSetup'), 'CLASSROOM');
    assert.equal(query.get('date'), date);
    assert.equal(query.get('attendees'), '100');
  });
});

test('a client previews a layout, sees the preferred room conflict and sends nonbinding preferences together', async () => {
  const user = userEvent.setup();
  const writes = [];
  openWorkspace('CLIENT', {
    '/venues': venues.map(v => ({ ...v, active: true })),
    '/venues/availability/reasons': [{ venueId:12, name:'Room A', available:false, reasons:['Room is held for another booking.'] }],
    '/vendors/service-categories':['av'],
    '/vendors/preference-options':[{ id:44, companyName:'Studio Light', serviceCategory:'av' }],
    '/inquiries/42':{id:42, status:'INQUIRY_SUBMITTED', requestedCategories:['av']},
  }, '/client/new-inquiry?preferredVenueId=12&date=' + date + '&attendees=160&eventType=meeting&tableSetup=CLASSROOM', config => {
    writes.push([config.url, JSON.parse(config.data)]); return {id:42};
  });
  await screen.findByText(/28 fewer than requested/);
  await screen.findByText('Room is held for another booking.', {selector:'.preference-summary p'});
  await user.click(screen.getByRole('button',{name:'View from above'}));
  assert.equal(screen.getByRole('button',{name:'View from above'}).getAttribute('aria-pressed'), 'true');
  await user.click(screen.getByText('Which setups fit 160 guests?'));
  await user.click(screen.getByRole('button',{name:'Use theatre'}));
  assert.equal(screen.getByRole('combobox',{name:/Table and seating setup/}).value,'THEATRE');
  assert.ok(screen.getByRole('img', { name:/Theatre seating/ }));
  assert.ok(screen.getByText(/fits your 160 guests/));
  await user.type(screen.getByRole('textbox',{name:'Event name'}),'Demo meeting');
  await user.click(screen.getByText(/Choose preferred vendors/));
  await user.click(await screen.findByRole('checkbox',{name:'Studio Light'}));
  await user.click(screen.getByRole('button',{name:'Send event request'}));
  await waitFor(() => assert.equal(writes.length,1));
  assert.equal(writes[0][0], '/inquiries');
  assert.equal(writes[0][1].preferredVenueId,12);
  assert.deepEqual(writes[0][1].preferredVendorIds,[44]);
  assert.equal(writes[0][1].tableSetup,'THEATRE');
});

test('client sees their preference against the offer and can clear both choices', async () => {
  const record = { ...inquiry, status:'PROPOSAL_SENT', preferredVenueId:14, preferredVenueName:'Room B', preferredVendorIds:[44], preferredVendorNames:{44:'Studio Light'} };
  const writes = [];
  const user = userEvent.setup();
  openWorkspace('CLIENT', {
    '/inquiries/17': record, '/inquiries/17/timeline':{},
    '/venues':venues.map(v => ({...v,active:true})),
    '/vendors/preference-options':[{id:44, serviceCategory:'av',companyName:'Studio Light'}],
  }, '/client/inquiries/17', config => { writes.push([config.url,JSON.parse(config.data)]); return {...record,preferredVenueId:null,preferredVendorIds:[]}; });
  assert.ok(await screen.findByText(/The proposal offers Room A/));
  await user.click(screen.getByText('Change venue and vendor preferences'));
  await user.selectOptions(await screen.findByRole('combobox',{name:'Preferred venue'}), '');
  await user.click(await screen.findByRole('checkbox',{name:'Studio Light'}));
  await user.click(screen.getByRole('button',{name:'Save preferences'}));
  assert.ok(await screen.findByText('Your preferences are saved.'));
  assert.deepEqual(writes,[['/inquiries/17/preferences',{preferredVenueId:null,preferredVendorIds:[]}]]);
});

test('a client can try another date for the same room and undo it without losing their event name', async () => {
  const user = userEvent.setup();
  const later = nextYear + '-06-18';
  const requests = [];
  openWorkspace('CLIENT', {
    '/venues':venues.map(v => ({...v,active:true})),
    '/venues/availability/reasons':[{venueId:12,name:'Room A',available:false,reasons:['Reserved.']}],
    '/vendors/service-categories':['av'],
  }, '/client/new-inquiry?preferredVenueId=12&date=' + date + '&attendees=100&eventType=meeting&tableSetup=THEATRE', config => {
    requests.push(JSON.parse(config.data));
    return {datesChecked:7,options:[{venueId:12,venueName:'Room A',eventDate:later,endDate:later,bookedFrom:nextYear+'-06-17',bookedThrough:nextYear+'-06-19',daysShift:3,capacity:300,tableSetup:'THEATRE'}]};
  });
  await user.type(await screen.findByRole('textbox',{name:'Event name'}),'Training week');
  await user.click(await screen.findByText('Find another room or nearby dates'));
  await user.click(screen.getByRole('checkbox',{name:'Only check Room A'}));
  await user.selectOptions(screen.getByRole('combobox',{name:/How flexible/}),'3');
  await user.click(screen.getByRole('button',{name:'Find booking options'}));
  await user.click(await screen.findByRole('button',{name:'Use this option in my request'}));
  assert.equal(requests[0].venueId,12);
  assert.equal(screen.getByLabelText('Start date').value,later);
  await user.click(screen.getByRole('button',{name:'Undo change'}));
  assert.equal(screen.getByLabelText('Start date').value,date);
  assert.equal(screen.getByRole('textbox',{name:'Event name'}).value,'Training week');
});

test('the coordinator prints a setup sheet with the requested table size and verified service status', async () => {
  const user = userEvent.setup();
  openWorkspace('COORDINATOR', {
    '/events/41':{id:41,name:'Forum dinner',status:'AWAITING_VENDORS',inquiryId:17,venue:'Room A',venueId:12,eventDate:date},
    '/events/41/categories':['av','security'],
    '/inquiries/17':{...inquiry,tableSetup:'BANQUET',requestedTableLayout:'BANQUET',requestedGuestsPerTable:8,expectedAttendees:98},
    '/assignments/event/41':[{id:65,serviceCategory:'av',status:'ACCEPTED',vendorName:'Forum sound'},{id:66,serviceCategory:'security',status:'PENDING'}],
    '/venues/12/bookings':[{eventId:41,status:'CONFIRMED',bookingDate:date}],
    '/checklists/event/41':[{id:91,itemName:'Set dining tables',ownerRole:'COORDINATOR',isComplete:false}],
  }, '/coordinator/events/41');
  await user.click(await screen.findByRole('button',{name:'Event setup sheet'}));
  const dialog = screen.getByRole('dialog',{name:'Event setup sheet'});
  assert.ok(within(dialog).getByText(/6 tables of 7 and 7 tables of 8/));
  assert.ok(within(dialog).getByText(/Forum sound · Accepted/));
  assert.ok(within(dialog).getByText('Awaiting vendor response'));
  let content;
  const originalPrint = window.print;
  window.print = () => {
    content = document.querySelector('body > .setup-print').textContent;
    window.dispatchEvent(new window.Event('afterprint'));
  };
  try { await user.click(within(dialog).getByRole('button',{name:'Print sheet'})); }
  finally { window.print = originalPrint; }
  assert.match(content,/Set dining tables/);
  assert.equal(document.querySelector('.setup-print'),null);
});

test('switching between inquiry sections preserves the unsent proposal edits', async () => {
  const user = userEvent.setup();
  render(h(MemoryRouter, { initialEntries: ['/coordinator/inquiries/17'] }, h(ToastProvider, null, h(AppProvider, null, h(Routes, null, h(Route, { path: '/coordinator/inquiries/:id', element: h(InquiryDetail) }))))));
  await user.click(await screen.findByRole('tab', { name: 'Proposal & versions' }));
  const input = screen.getByRole('textbox', { name: 'Event name' });
  await user.clear(input);
  await user.type(input, 'Updated event name');
  await user.click(screen.getByRole('tab', { name: 'Client requirements' }));
  await user.click(screen.getByRole('tab', { name: 'Proposal & versions' }));
  assert.equal(screen.getByRole('textbox', { name: 'Event name' }).value, 'Updated event name');
  assert.equal(sent.length, 0);
});

test('booking checks show conflicts and recorded rankings without promising a booking or a response time', async () => {
  const user = userEvent.setup();
  render(h(BookingChecks, { onCancel() {}, preview: {
    eventType: 'meeting', eventDate: date, expectedAttendees: 100,
    venue: { venueName: 'Room A', available: false, message: 'A live hold covers these dates.', capacity: 300 },
    categories: [{ category: 'av', candidates: [{ vendorId: 51, companyName: 'AV candidate', rank: 1, score: .85, qualityScore: .9, workloadScore: .8, rotationScore: .8, currentLoad: 2 }] }],
    timelineEstimate: 'Confirmed within 5 days',
  } }));
  assert.ok(screen.getByText(/Resolve the conflict and agree any revised terms/));
  assert.equal(screen.queryByText('Confirmed within 5 days'), null);
  await user.click(screen.getByText('Audiovisual', { selector: 'strong' }));
  assert.ok(screen.getByText('85%'));
  assert.ok(screen.getByText(/This is a/));
  assert.equal(sent.length, 0);
});

test('a coordinator claims a request at the booking desk and opens its proposal editor', async () => {
  const user = userEvent.setup();
  const request = { ...inquiry, proposal: null, status: 'INQUIRY_SUBMITTED' };
  const owner = { id: 4, name: 'Demo user', active: true };
  const writes = [];
  openWorkspace('COORDINATOR', { '/inquiries': [request], '/inquiries/17':request }, undefined, config => {
    writes.push(config.url);
    assert.equal(config.url, '/inquiries/17/coordinator/claim');
    request.coordinator = owner;
    return { coordinator: owner };
  });
  const selected = within(await screen.findByRole('article', { name:'Selected booking' }));
  await user.click(selected.getByRole('button', {name:'Claim this work'}));
  assert.deepEqual(writes, ['/inquiries/17/coordinator/claim']);
  await user.click(await screen.findByRole('link', {name:'Prepare proposal'}));
  await waitFor(() => assert.equal(screen.getByRole('tab', {name:'Proposal & versions'}).getAttribute('aria-selected'), 'true'));
});

test('the booking desk shows the actual receipt decision and keeps other coordinators’ work read-only', async () => {
  const user = userEvent.setup();
  const mine = { ...inquiry, status:'PROPOSAL_ACCEPTED', coordinator:{id:4,name:'Demo user'} };
  const other = { ...inquiry, id:21, eventName:'Expo', status:'INQUIRY_SUBMITTED', coordinator:{id:8,name:'Other lead'} };
  openWorkspace('COORDINATOR', { '/inquiries':[mine, other],
    '/inquiries/17/booking-agreement':{state:'AWAITING_REVIEW', terms:{venue:'Room A', totalEtb:6000, bookedFrom:date, bookedThrough:date}} });
  assert.ok(await screen.findByRole('heading', {name:'Payment receipt is ready for your review'}));
  assert.equal(screen.getByRole('link', {name:'Review payment receipt'}).getAttribute('href'), '/coordinator/inquiries/17?section=agreement');
  await user.selectOptions(screen.getByLabelText('Show work for'), 'all');
  await user.type(screen.getByLabelText('Search all stages'), 'Expo');
  assert.ok(await screen.findByRole('heading', {name:'Other lead is handling this request'}));
  assert.equal(screen.queryByRole('button', {name:'Claim this work'}), null);
});

test('a competing claim refreshes the desk with the winning owner', async () => {
  const user = userEvent.setup();
  const request = { ...inquiry, status:'INQUIRY_SUBMITTED', proposal:null };
  openWorkspace('COORDINATOR', { '/inquiries':[request] }, undefined, config => {
    assert.equal(config.url, '/inquiries/17/coordinator/claim');
    request.coordinator = {id:9, name:'Other lead'};
    throw Object.assign(new Error('Already claimed'), {response:{status:409}});
  });
  await user.click(await screen.findByRole('button', {name:'Claim this work'}));
  assert.ok(await screen.findByText(/assignment for Forum changed/));
  await user.selectOptions(screen.getByLabelText('Show work for'), 'all');
  assert.ok(await screen.findByRole('heading', {name:'Other lead is handling this request'}));
  assert.equal(screen.queryByRole('button', {name:'Claim this work'}), null);
});
