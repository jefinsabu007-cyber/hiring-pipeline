# Candidate Hiring Pipeline System

MERN app: Express + MongoDB (Mongoose) API, React + Tailwind + Zustand frontend.

## Run locally
```bash
# Backend
cd backend && cp .env.example .env && npm install && npm run dev
# Frontend (new terminal)
cd frontend && npm install && npm run dev      # http://localhost:5173
```
## Run with Docker
```bash
docker compose up --build     # app at http://localhost:8080
```
Sign up as a **recruiter** and as an **interviewer** (two accounts) to try the full flow.

## Features
- JWT auth, bcrypt hashing, protected routes, role-based access (recruiter / interviewer)
- **Secure login:** Google Sign-In (ID token verified server-side), account lockout after 5 wrong passwords, per-IP rate limits, strong-password policy, honeypot + timing bot traps, disposable-email blocking, optional Google reCAPTCHA v3, optional recruiter email-domain allowlist
- Candidate CRUD, 7-stage pipeline, notes, search + stage filter + pagination
- Interview scheduling, upcoming-interviews list, feedback (1–5 rating, recommendation)
- Dashboard stage cards, recruiter activity log, mock email notifications (server console)
- Zod validation, rate limiting, Helmet, central error handler, dark mode, responsive UI

## Secure login setup
1. **Google sign-in** (Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → *Web application*):
   add *Authorized JavaScript origins*: `http://localhost:5173` and your public URL (e.g. `https://your-app.vercel.app`).
   Put the client ID in `backend/.env` as `GOOGLE_CLIENT_ID` and in `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`
   (on Vercel/Render add them as environment variables, then redeploy the frontend because Vite reads it at build time).
2. **reCAPTCHA v3 (optional):** create keys at google.com/recaptcha/admin → `RECAPTCHA_SECRET` (backend) and `VITE_RECAPTCHA_SITE_KEY` (frontend).
3. **Production:** set `NODE_ENV=production`, a random `JWT_SECRET` (32+ chars) and `CLIENT_URL` to your frontend URL.
4. **Optional:** `RECRUITER_EMAIL_DOMAINS=yourcompany.com` so only company emails can register as recruiters.

Docker: put these values in a `.env` file next to `docker-compose.yml` (`JWT_SECRET`, `GOOGLE_CLIENT_ID`, `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET`).

## Architecture
`backend/src`: `models.js` (schemas) · `middleware/auth.js` (JWT, role guard, activity log, mock mailer) · `routes/*` (REST resources)
`frontend/src`: `store.js` (Zustand) · `api.js` (fetch wrapper) · `pages/*` · `components/ui.jsx`

Interviewers only see candidates they have an interview with, and can only submit feedback for their own interviews.

## API (all under `/api`, Bearer token except auth)
| Method | Path | Role |
|---|---|---|
| POST | /auth/signup, /auth/login · GET /auth/me | public / any |
| GET | /candidates?q=&stage=&page=&limit= · /candidates/stats · /candidates/:id | any (interviewer scoped) |
| POST/PUT/DELETE | /candidates, /candidates/:id | recruiter |
| PATCH | /candidates/:id/stage | recruiter |
| POST | /candidates/:id/notes | any (interviewer scoped) |
| GET | /interviews?upcoming=true&candidate= | any (interviewer scoped) |
| POST/PUT/DELETE | /interviews, /interviews/:id | recruiter |
| GET | /feedback?candidate= | any (interviewer sees own) |
| POST/PUT/DELETE | /feedback, /feedback/:id | interviewer |
| GET | /users/interviewers | recruiter |

## Not included (next steps)
Drag-and-drop board, charts, Swagger/Postman file, automated tests, live deployment.
