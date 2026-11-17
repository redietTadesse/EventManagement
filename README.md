# AICC Event Management System

This project models how a customer submits an inquiry and how an AICC coordinator checks venue availability, sends a proposal, and reserves a venue. It also demonstrates a proposed event organization workflow with vendor selection, offers, reassignment, and operational tasks.

Venue rental is the current AICC activity reported to the team. Event organization was described as a possible future direction. The steps in this application are the team's proposed workflow. AICC's booking approvals, departmental handoffs, and rules for honoring client vendor preferences still need stakeholder validation.

## Run locally

The frontend is a React/Vite application in `src/`. The Spring Boot API is in `event-backend/`. Use Java 17 or later, Maven, Node.js and npm. For a persistent local installation, use a MySQL database dedicated to the app.

Set the following in PowerShell from the repository root, using your local database settings:

```powershell
cd event-backend
$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/aicc_events'
$env:SPRING_DATASOURCE_USERNAME = 'your-local-user'
$env:SPRING_DATASOURCE_PASSWORD = 'your-local-password'
$env:JWT_SECRET = 'replace-with-a-random-secret-at-least-32-bytes'
$env:APP_EMAIL_ENABLED = 'false'
mvn.cmd spring-boot:run
```

In another PowerShell terminal at the repository root:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open [the app](http://localhost:5173) or [the API reference](http://localhost:8080/swagger-ui/index.html). The frontend uses `http://localhost:8080/api/v1` by default. Set `VITE_API_URL` before starting Vite to use a different API.

For a repeatable demo with disposable data, use the isolated browser setup in the [testing guide](event-backend/TESTING.md).
