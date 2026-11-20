# ADMITRA — Online Admission System

Final Year Project, Department of Computer Science, Government College University Faisalabad.

ADMITRA is a multi-institution online admission platform. Colleges and universities manage their admissions in private workspaces, while each student maintains one profile and applies to multiple institutions.

```text
ADMITRA/
├── backend/    Express.js 5 REST API in TypeScript (MongoDB + Mongoose)
└── frontend/   Next.js 16 web application in TypeScript + Tailwind CSS
```

## Technology

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack React Query 5, Axios, React Hook Form, Zod, Recharts, Lucide icons |
| Backend | Node.js, Express.js 5, TypeScript, Mongoose 9, Zod, JWT, Argon2id, Helmet, Pino, Nodemailer |
| Database | MongoDB 8 Community Server (single-node replica set), MongoDB Compass |
| Testing | Vitest, Supertest, MongoDB replica set |

## 1. Prerequisites

- Node.js 22 or newer
- MongoDB 8 Community Server
- MongoDB Compass

## 2. Database Setup

ADMITRA uses MongoDB transactions, which require a replica set. A single-node replica set is sufficient for local development.

**Windows**

1. Open `mongod.cfg` as administrator:

   ```text
   C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg
   ```

2. Add the following configuration:

   ```yaml
   replication:
     replSetName: rs0
   ```

3. Restart the MongoDB Server service from Windows Services.

4. Open MongoDB Compass and connect to:

   ```text
   mongodb://127.0.0.1:27017/?directConnection=true
   ```

5. Open the MongoDB shell in Compass and run:

   ```javascript
   rs.initiate({
     _id: 'rs0',
     members: [{ _id: 0, host: '127.0.0.1:27017' }]
   })
   ```

**Linux / macOS**

Start MongoDB with replica set support:

```bash
mongod --replSet rs0 --dbpath ~/mongo-data --bind_ip 127.0.0.1
```

Initialize the replica set:

```bash
mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })"
```

Connect MongoDB Compass using:

```text
mongodb://127.0.0.1:27017/admitra?replicaSet=rs0
```

## 3. Backend Setup

Navigate to the backend directory:

```bash
cd ADMITRA/backend
```

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
copy .env.example .env
```

On Linux/macOS, use:

```bash
cp .env.example .env
```

Configure `MONGODB_URI`, `JWT_ACCESS_SECRET` and other required environment variables in `.env`.

Create the Super Admin account, subscription plans and sample institutions:

```bash
npm run seed -- --sample
```

Start the backend:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000/api/v1
```

Health check:

```text
http://localhost:5000/api/v1/health
```

In development, verification, invitation and password-reset emails are printed in the backend terminal. Configure SMTP settings in `.env` to send real emails.

## 4. Frontend Setup

Open a separate terminal and navigate to:

```bash
cd ADMITRA/frontend
```

Install dependencies:

```bash
npm install
```

Create the frontend environment file:

```bash
copy .env.example .env.local
```

On Linux/macOS, use:

```bash
cp .env.example .env.local
```

Start the frontend:

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

Frontend requests to `/api/v1` are forwarded to the backend.

## 5. Sample Accounts

The following accounts are available after running `npm run seed -- --sample`.

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@admitra.local` | `Admin@12345` (from `.env`) |
| Institution Admin | `admin@cvu.example.edu.pk` | `Admitra@123` |
| Admission Officer | `officer@cvu.example.edu.pk` | `Admitra@123` |
| HOD Officer | `hod.cs@cvu.example.edu.pk` | `Admitra@123` |
| Finance Officer | `finance@cvu.example.edu.pk` | `Admitra@123` |
| Merit Committee | `merit1@cvu.example.edu.pk` | `Admitra@123` |
| Applicant | `ayesha.noor@example.com` | `Admitra@123` |

Sample institutions and accounts are fictional and intended only for development and demonstration.

To reset the development database and recreate sample data:

```bash
npm run seed -- --reset --sample
```

This command clears existing data and must only be used in development.

## 6. Available Scripts

| Directory | Command | Description |
|---|---|---|
| Backend | `npm run dev` | Start API in development mode |
| Backend | `npm test` | Run API tests |
| Backend | `npm run build` | Build backend for production |
| Backend | `npm start` | Start production backend |
| Backend | `npm run lint` | Run backend lint checks |
| Backend | `npm run typecheck` | Check backend TypeScript types |
| Frontend | `npm run dev` | Start Next.js development server |
| Frontend | `npm run build` | Build frontend for production |
| Frontend | `npm start` | Start production frontend |
| Frontend | `npm run lint` | Run frontend lint checks |
| Frontend | `npm run typecheck` | Check frontend TypeScript types |

## 7. Phase 1 — Development Status

| Phase | Scope | Status |
|---|---|---|
| 1. Foundation, SaaS Core and Design System | Project structure, authentication, RBAC, multi-tenancy, audit logs, institution onboarding, subscription plans, academic structure, programs, admission campaigns and public website | Complete |
| 2. Applicant Portal and Admission Operations | Applicant profiles, academic records, marks verification, documents, applications, fee challans, payment verification and notifications | Planned |
| 3. Merit and Enrollment | Merit calculation, seat allocation, merit lists, admission offers, enrollment, Admission Advisor and Result Finder | Planned |
| 4. Analytics, Support and Quality | Reports, exports, support tickets, automated testing, accessibility, security hardening and delivery | Planned |
| 5. Branding and Mitra AI | Institution branding, AI admission copilot, live-data tools, authorized actions, briefings and integrity alerts | Planned |

## 8. Phase 1 — Implemented Features

Phase 1 establishes the foundation of ADMITRA and provides the core platform functionality required for subsequent development.

**Authentication and Access Control**
- User registration and login.
- Email verification and password reset.
- Rotating refresh tokens and session management.
- Login lockout and role-based access control.
- Staff invitations and permission management.

**Multi-Institution Management**
- Super Admin institution onboarding and approval.
- Independent institution workspaces and tenant isolation.
- Subscription plans, limits and institution status management.
- Grace periods and account suspension.

**Academic Structure**
- Campus management.
- Faculties and departments.
- Academic sessions.
- Degree programs and program configuration.

**Admission Campaigns**
- Admission campaign creation and management.
- Campaign status and application-period rules.
- Publicly accessible institution and program information.

**Design System and Public Website**
- Responsive desktop and mobile layouts.
- Light and dark themes.
- Reusable interface components.
- Public-facing admission website.

Phase 1 provides the authentication, institutional, academic and admission-campaign foundation for the remaining ADMITRA development phases.