Rotom
Full-Stack College Society & Club Event Management Platform
Rotom is a full-stack web application for managing college societies, clubs, events, and student participation in one place. It brings event discovery, registrations, scheduling, announcements, and club administration together instead of relying on scattered posters, messaging groups, and spreadsheets.

Features
Four user roles: Guest, Student, Club Admin, and Website Admin.
Server-side role-based access control: protected endpoints enforce authorization on the backend.
Club management: view clubs and manage club information according to permissions.
Event management: create and manage events, browse upcoming and past events, and view event details.
Event registration: students can register for events while registration is open through the event date.
Student participation: view registered events and participation history.
Scheduling: calendar-based event scheduling with India-specific 2026 holidays.
Announcements and moderation: share updates and support website administration.
AI event ideas and chat: Gemini-powered assistance with request limits, timeouts, fallback-model handling, and a frontend cooldown.
Club logos: HTTPS logo URLs with validation and initials as a fallback.
Gothic academic visual theme: includes light and dark theme support.
Organization chart: a visual view of club/organization structure.

Tech Stack
Layer	Technologies
Frontend	React 19, Vite 8, React Router 7, JavaScript
Backend	Node.js, Express 5
Database	MongoDB Atlas, Mongoose 9
AI	Google Gemini via @google/genai
Testing	Vitest, Testing Library, Playwright
Tooling	npm, Git, GitHub

Project Structure
Rotom/
├── backend/
│   ├── scripts/
│   ├── ...
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── e2e/
│   ├── ...
│   └── .env.example
└── README.md

Requirements
Node.js (use a current supported LTS release compatible with the project)
npm
A MongoDB Atlas database
A Gemini API key for AI features


Local Setup
Run commands from the project root, C:\dev\Rotom, unless a step says otherwise.
1. Install dependencies
npm install --prefix backend
npm install --prefix frontend
2. Configure environment variables
Copy backend/.env.example to backend/.env and fill in the values for your local environment. Configure frontend/.env only if you need to override the frontend API URL.

Backend variables:
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_local_random_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
AI_API_KEY=your_gemini_api_key
AI_MODEL=your_primary_gemini_model
AI_MODEL_FALLBACK=your_fallback_gemini_model
DEMO_PASSWORD=your_local_demo_password
The names above are the expected keys; use the exact values and model names appropriate for your environment. DEMO_PASSWORD is only needed when running the demo seed script.

Optional frontend variable:

VITE_API_URL=http://localhost:5000/api
Never commit .env files or put backend secrets in VITE_ variables. Anything prefixed with VITE_ can be exposed in the browser bundle.

3. Start the development servers
Open two PowerShell terminals at the project root.

Terminal 1, backend:

npm run dev --prefix backend
Terminal 2, frontend:

npm run dev --prefix frontend
The development backend uses port 5000 and the Vite frontend uses port 5173 by default. Open the local URL printed by Vite.

Testing
Run the backend unit/security tests:

npm test --prefix backend
Run the frontend unit tests:

npm test --prefix frontend
Run frontend lint checks:

npm run lint --prefix frontend
Run the Playwright end-to-end suite from the frontend directory:

cd frontend
npm run e2e
The E2E suite requires E2E_MONGODB_URI to be set in the current PowerShell session and to point to a disposable test database whose name ends in _test. Do not point E2E tests at development or production data.

Demo Data
The backend includes demo and E2E seed scripts under backend/scripts/.

seedDemo.js creates demo students, club administrators, and historical events. It requires DEMO_PASSWORD and refuses to run when NODE_ENV=production.
seedE2E.js is intended for automated tests and refuses databases whose names do not end in _test.
Read the scripts before running them and verify the printed database name. Use only a disposable database for E2E seeding.

Security Notes
Authentication and role checks are enforced on the server.
Secrets belong in environment variables, not source control.
Production must use a dedicated MongoDB database and a database user with only the permissions it needs.
Use a fresh, randomly generated production JWT_SECRET.
Set NODE_ENV=production in the production backend environment.
Keep DEMO_PASSWORD unset in production.
Configure the production frontend origin in FRONTEND_URL and set the frontend's VITE_API_URL to the deployed API URL ending in /api.
Do not expose AI_API_KEY, JWT_SECRET, or MongoDB credentials in frontend variables or public files.
Deployment
Rotom's frontend is a Vite single-page application and its backend is an Express API. They can be deployed separately. The frontend host must rewrite application routes to index.html; the backend should expose /api/health as its health-check endpoint.


⋮⋮⋮⋮
