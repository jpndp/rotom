# Rotom

**Full-Stack College Society & Club Event Management Platform**

Rotom is a full-stack web application for managing college societies, clubs, events, and student participation in one place. It brings event discovery, registrations, scheduling, announcements, and club administration together instead of relying on scattered posters, messaging groups, and spreadsheets.

## Features

- Four user roles: Guest, Student, Club Admin, and Website Admin.
- **Server-side role-based access control:** protected endpoints enforce authorization on the backend.
- **Club management:** view clubs and manage club information according to permissions.
- **Event management:** create and manage events, browse upcoming and past events, and view event details.
- **Event registration:** students can register for events while registration is open through the event date.
- **Student participation:** view registered events and participation history.
- **Scheduling:** calendar-based event scheduling with India-specific 2026 holidays.
- **Announcements and moderation:** share updates and support website administration.
- **AI event ideas and chat:** Gemini-powered assistance with request limits, timeouts, fallback-model handling, and a frontend cooldown.
- **Club logos:** HTTPS logo URLs with validation and initials as a fallback.
- **Gothic academic visual theme:** includes light and dark theme support.
- **Organization chart:** a visual view of club and organization structure.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, JavaScript |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas, Mongoose 9 |
| AI | Google Gemini via `@google/genai` |
| Testing | Vitest, Testing Library, Playwright |
| Tool
 

### Production Deployment Checks

- Configure `FRONTEND_URL` on the backend to the exact deployed frontend origin, including the scheme but no path. Production startup requires this variable, and CORS only permits that origin.
- Keep `.env` files out of Git. Only `.env.example` files should be committed.
- Before launch, review the production database for demo accounts, including `admin0-2@demo.edu` and `student<number>@demo.edu`. Remove demo accounts or rotate their credentials as appropriate.
- `backend/scripts/seedDemo.js` is for non-production use only and refuses to run when `NODE_ENV=production`.
- Use separate development, E2E testing, and production databases.
- Verify the deployed frontend's API URL and confirm that the backend health endpoint responds correctly before launch.