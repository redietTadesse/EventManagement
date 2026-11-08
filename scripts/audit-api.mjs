// Read-only smoke checks against the local demo backend. No business data is changed.
// Override AICC_API_ROOT and AICC_DEMO_PASSWORD for a separate demo environment.
const root = process.env.AICC_API_ROOT || 'http://localhost:8080/api/v1';
const password = process.env.AICC_DEMO_PASSWORD || 'Admin@123';
const results = [];
async function check(role, path, token, expected = 200) {
  const response = await fetch(`${root}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.text();
  results.push({ role, path, expected, actual: response.status, pass: response.status === expected });
  if (response.ok && response.headers.get('content-type')?.includes('json')) {
    try { return JSON.parse(body); } catch { results.at(-1).pass = false; }
  }
  return null;
}
for (const role of ['coordinator', 'admin', 'client', 'vendor']) {
  const login = await fetch(`${root.replace(/\/v1\/?$/, '')}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: role, password }), signal: AbortSignal.timeout(15000),
  });
  if (!login.ok) throw new Error(`${role} login returned ${login.status}`);
  const { accessToken } = await login.json();
  const me = await check(role, '/users/me', accessToken);
  const paths = {
    coordinator: ['/coordinator/stats', '/coordinator/action-required', '/coordinator/upcoming-events?startDate=2026-11-02&endDate=2026-12-02', '/inquiries', '/vendors', '/vendors/availability-grid?category=av&daysAhead=30', '/history/recent'],
    admin: ['/admin/dashboard/stats', '/vendors', '/vendors/service-categories'],
    client: [`/inquiries/client/${me.id}`, '/vendors/service-categories?eventType=conference'],
    vendor: ['/vendors/me', '/assignments/me', '/assignments/open'],
  }[role];
  for (const path of paths) await check(role, path, accessToken);
  if (role !== 'vendor') {
    const venues = await check(role, '/venues', accessToken);
    if (role !== 'client') for (const venue of (venues || []).slice(0, 2)) {
      for (const suffix of ['', '/bookings', '/unavailable-dates']) await check(role, `/venues/${venue.id}${suffix}`, accessToken, suffix === '/unavailable-dates' && role === 'coordinator' ? 403 : 200);
    }
  }
  const events = await check(role, '/events', accessToken);
  for (const event of (events || []).slice(0, 2)) {
    await check(role, `/events/${event.id}`, accessToken);
    if (role !== 'vendor') for (const path of [`/assignments/event/${event.id}`, `/history/event/${event.id}`, `/events/${event.id}/readiness`]) await check(role, path, accessToken, role === 'client' && path.startsWith('/history/') ? 403 : 200);
    if (role === 'coordinator') for (const path of [`/checklists/event/${event.id}`, `/events/${event.id}/categories`, `/events/${event.id}/vendor-trail`]) await check(role, path, accessToken);
  }
  if (['client', 'coordinator'].includes(role)) {
    const inquiries = await check(role, role === 'client' ? `/inquiries/client/${me.id}` : '/inquiries', accessToken);
    for (const inquiry of (inquiries || []).slice(0, 2)) {
      for (const suffix of ['', '/timeline']) await check(role, `/inquiries/${inquiry.id}${suffix}`, accessToken);
      if (inquiry.proposal) await check(role, `/inquiries/${inquiry.id}/quote-pdf`, accessToken);
    }
  }
  if (['admin', 'coordinator'].includes(role)) {
    const vendors = await check(role, '/vendors', accessToken);
    for (const vendor of (vendors || []).slice(0, 2)) for (const suffix of ['', '/performance', '/assignments']) await check(role, `/vendors/${vendor.id}${suffix}`, accessToken);
  }
  if (role === 'vendor') {
    const assignments = await check(role, '/assignments/me', accessToken);
    if (assignments?.length) await check(role, `/assignments/me/${assignments[0].id}`, accessToken);
  }
  if (['client', 'vendor'].includes(role)) await check(role, '/admin/dashboard/stats', accessToken, 403);
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), passed: results.filter(r => r.pass).length, total: results.length, failures: results.filter(r => !r.pass) }, null, 2));
if (results.some(r => !r.pass)) process.exitCode = 1;
