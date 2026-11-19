import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

// Real components, a DOM and a fake HTTP transport. No test writes to AICC's server.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5174', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLIFrameElement', 'HTMLButtonElement', 'HTMLFieldSetElement', 'HTMLLegendElement', 'HTMLInputElement', 'SVGElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'getComputedStyle', 'localStorage', 'sessionStorage']) {
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
 export { AppProvider } from './src/context/AppContext.jsx';
 export { ToastProvider } from './src/context/ToastContext.jsx';
 export { default as api } from './src/api/axios.js';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', define: { 'import.meta.env': '{}' } });
await writeFile(bundle, result.outputFiles[0].text);
const { Composer, Recovery, ClientVenues, InquiryDetail, BookingChecks, AppProvider, ToastProvider, api } = await import(pathToFileURL(bundle));
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
afterEach(() => { cleanup(); sent = []; failAvailability = false; });
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
    assert.equal(query.get('tableSetup'), 'CLASSROOM');
    assert.equal(query.get('date'), date);
    assert.equal(query.get('attendees'), '100');
  });
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
