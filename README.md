# AICC Event Management System

Web-based system for the Addis International Convention Center that unifies event
planning, venue booking, and vendor coordination.

## Tech Stack
- **Backend:** Spring Boot 3 (Java 17) with Spring Security (JWT), Spring Data JPA, Flyway, MySQL
- **Frontend:** React SPA (Vite) with React Router, Bootstrap-style UI, Recharts

## Structure
```
eventmanagement/   # Spring Boot backend (REST API)
src/               # React frontend
public/            # Static assets (PWA manifest)
```

## Run
Backend:
```
cd eventmanagement
set JWT_SECRET=<secret> DB_USERNAME=root DB_PASSWORD=<pw>
./mvnw spring-boot:run
```
Frontend:
```
npm install
npm run dev
```
API docs: `http://localhost:8080/api-docs`