# Running the regression checks

From `event-backend`, run the full backend suite:

```powershell
mvn.cmd test
```

To run only the authenticated lifecycle scenarios:

```powershell
mvn.cmd -Dtest=EventLifecycleApiIntegrationTest test
```

Use `mvn` in place of `mvn.cmd` on other operating systems. An initial run needs the Maven dependencies available; `-o` can be added when they are already cached.

Every Spring integration test selects the `test` profile. That profile uses in-memory H2, creates and drops its test schema, disables Flyway, and disables email delivery. The lifecycle API class also supplies its own database name and verifies the connection URL before preparing fixtures. It does not use the local `aicc_events` database.

## What the lifecycle API scenarios establish

`EventLifecycleApiIntegrationTest` uses real controllers, signed JWTs, authorization, services, ranking and persistence. Users, vendors and venues are reference fixtures. Business actions are authenticated MockMvc requests. There is deliberately no transaction wrapping an entire test: each request must commit and serialize its own response.

The scenarios cover:

- Proposal preparation and preview create no vendor commitments; conversion reserves the full venue window, excludes expired insurance, and omits external catering for a conference.
- A decline creates a separate replacement offer; accepting every required service confirms the event. Earlier attempts remain in history.
- Checklist prerequisites block completion, regeneration preserves edits and manual tasks, and rescheduling moves only deadlines that still follow template offsets. Vendors must reconfirm, and readiness retains the existing weights before event completion.
- An exhausted pool can recover through either manual assignment or force assignment. Cancellation releases active assignments and venue bookings while preserving historical declines.
- A service with no initial vendor keeps the event in `NEEDS_COORDINATOR` and below full readiness until a coordinator resolves it.
- A venue conflict discovered at conversion rolls back the new event, tasks and assignments. Two unsynchronized conversion requests for the same venue produce one successful booking and one conflict response.
- A request for proposal changes preserves editability; final rejection blocks edits, acceptance and conversion with validation responses.
- The customer timeline separates proposal acceptance from the venue reservation and reflects cancellation.
- The coordinator attention feed and venue bookings serialize after their requests end. Admin vendor profile edits, including clearing an insurance expiry, persist across requests.

Assertions read state in subsequent requests and check persisted records, response DTO fields, assignment attempts and lifecycle actors.

## Frontend checks

From the frontend root:

```powershell
node --test src/components/calendarModel.test.js src/coordinator/dashboardModel.test.js src/coordinator/eventDetailModel.test.js src/utils/forms.test.js
npm.cmd run build
```

## Isolated browser walkthrough

From `event-backend`, start the browser fixture server:

```powershell
mvn.cmd '-Dspring-boot.run.main-class=com.aicc.eventmanagement.BrowserAuditServer' spring-boot:test-run
```

Wait for `BROWSER AUDIT READY`. From the frontend root in a separate terminal:

```powershell
$env:VITE_API_URL = 'http://localhost:18081/api/v1'
npm.cmd run dev -- --port 5174 --strictPort
```

Open [the isolated app](http://localhost:5174). Its fixture usernames are `client`, `coordinator`, `vendor`, and `admin`, with password `Admin@123` for all four. The server uses an in-memory database with email disabled. Restart it to reset the data.

1. As the client, submit a future conference for fewer than 500 people with AV as the only requested service. Confirm the submitted request opens and remains available in My Inquiries after signing back in.
2. As the coordinator, open the request and send a proposal for Audit Hall with Audit AV as the suggested vendor.
3. As the admin, open the management dashboard and check the amber **Proposal sent** stage. As the client, accept the proposal and verify that **Venue Booked** is still unchecked.
4. Sign the agreement as both the client and the assigned coordinator. As the client, upload a sample payment receipt. On the admin dashboard, refresh revenue and lifecycle. The contract should appear under **Awaiting review** and its amount should still be outside gross verified payments.
5. As the assigned coordinator, download the receipt and verify payment to book the venue. Check the calendar, pending vendor offer, tasks, and history. Refresh the admin dashboard to see the amount in gross verified payments and the record move into **Event preparation**.
6. As the vendor, accept the AV offer. As the client, follow **View event details** and check the confirmed status. Refresh the admin lifecycle view to see the record in **Confirmed**.

For a defense demo, introduce vendor assignment and event operations as proposed future capabilities. The single-vendor fixture is for a deterministic walkthrough. The authenticated integration suite exercises replacement vendors and competing venue requests.

## Limits of these checks

H2 does not establish MySQL migration compatibility or MySQL-specific locking behavior. MockMvc does not exercise browser rendering or navigation. Fixture JWTs exercise protected business endpoints but do not test registration or the login screen. Email delivery is disabled, so these runs do not establish SMTP delivery. Those checks require separate environments and should be reported separately.
