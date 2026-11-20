# ADMITRA — Online Admission System

**Final Year Project**  
Department of Computer Science, Government College University Faisalabad.

ADMITRA is a multi-institution online admission platform. Multiple colleges and universities can manage their admissions through private workspaces, while each student maintains one profile and applies to multiple institutions.

## Project Structure

```text
ADMITRA/
├── backend/    Express.js 5 REST API in TypeScript (MongoDB + Mongoose)
├── frontend/   Next.js 16 (App Router) web application in TypeScript + Tailwind CSS
├── README.md
└── .gitignore
```

## Technology

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack React Query 5, Axios, React Hook Form, Zod, Recharts, Framer Motion, Lucide icons |
| Backend | Node.js, Express.js 5, TypeScript, Mongoose 9, Zod, JWT, Argon2id, Helmet, Pino, Nodemailer, Socket.IO, PDFKit, Multer, Papa Parse, ExcelJS |
| Database | MongoDB 8 Community Server (single-node replica set), MongoDB Compass |
| Testing | Vitest, Supertest, Playwright (phone and desktop), axe-core for WCAG 2.2 AA accessibility checks |
| API Documentation | OpenAPI 3.1 generated from routers, Swagger UI at `/api/v1/docs` |

## 1. Prerequisites

- Node.js 22 or newer (Node.js 26 LTS recommended).
- MongoDB 8 Community Server.
- MongoDB Compass.

## 2. Run MongoDB as a Replica Set

ADMITRA uses MongoDB transactions, which require a replica set. A single-node replica set is sufficient for local development.

### Windows (MongoDB installed as a service)

1. Open the MongoDB configuration file as administrator:

   ```text
   C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg
   ```

2. Add the following configuration:

   ```yaml
   replication:
     replSetName: rs0
   ```

3. Restart the MongoDB service:
   - Open Windows Services.
   - Find **MongoDB Server**.
   - Select **Restart**.

4. Open MongoDB Compass and connect using:

   ```text
   mongodb://127.0.0.1:27017/?directConnection=true
   ```

5. Open the MongoDB shell (`>_ MONGOSH` at the bottom) and run this command once:

   ```javascript
   rs.initiate({
     _id: 'rs0',
     members: [{ _id: 0, host: '127.0.0.1:27017' }]
   })
   ```

### Linux / macOS

Start MongoDB with replica set support:

```bash
mongod --replSet rs0 --dbpath ~/mongo-data --bind_ip 127.0.0.1
```

Initialize the replica set in another terminal:

```bash
mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })"
```

After initialization, connect MongoDB Compass using:

```text
mongodb://127.0.0.1:27017/admitra?replicaSet=rs0
```

## 3. Backend Setup

Open a terminal in the project directory and navigate to the backend:

```bash
cd ADMITRA/backend
```

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env`. The default configuration is suitable for local development.

### Load Demo Data

Create the Super Admin account, plans, and complete sample data, including institutions, applicants, merit lists, and Reference Directory records:

```bash
npm run seed:demo
```

**Important:** The demo seed clears the existing database before loading sample data. It takes approximately 30 seconds and is intended for development and demonstration only.

For a clean installation without demo records, run:

```bash
npm run seed
```

This creates only the Super Admin and plans. Dashboards will show empty data until actual records are entered.

Start the backend development server:

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

During development, verification emails, invitations, and password-reset emails are printed in the terminal with their links.

To receive emails in an actual inbox, configure `SMTP_HOST` and the related SMTP settings in `.env`. For local email testing, Mailpit can be used at:

```text
127.0.0.1:1025
```

## 4. Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd ADMITRA/frontend
```

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env.local`.

Start the frontend development server:

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

Requests to `/api/v1` are forwarded to the backend API.

## 5. Sample Accounts

The following accounts are available after running:

```bash
npm run seed:demo
```

All sample accounts use the password:

```text
Admitra@123
```

The Super Admin uses the password configured in `.env`.

| Role | Email | What to Explore |
|---|---|---|
| Super Admin | `admin@admitra.local` | Institutions, plans, registry import, Reference Directory, Analytics (Admission Advisor usage and registry match rates), Support Tickets, and Audit Log |
| Institution Admin (Crescent Valley University) | `admin@cvu.example.edu.pk` | Fall 2026 campaign, applications, and directory data |
| Admission Officer (CVU) | `officer@cvu.example.edu.pk` | Application review and marks verification |
| HOD Officer, Computer Science (CVU) | `hod.cs@cvu.example.edu.pk` | Applications belonging to the Computer Science department only |
| Finance Officer (CVU) | `finance@cvu.example.edu.pk` | Payment verification |
| Merit Committee (CVU) | `merit1@cvu.example.edu.pk` | Active formulas and a proposed version 2 for BSCS |
| Institution Admin (Riverside Institute of Technology) | `admin@rit.example.edu.pk` | Merit-list publication, revocation, offers, enrollment, Analytics & Reports, Support, and Audit Log |
| Admissions and Accounts (RIT) | `officer@rit.example.edu.pk` | Admission-fee proofs and originals check on reporting day |
| Merit Committee (RIT) | `merit1@rit.example.edu.pk` | Generated merit list 3, waiting for the second member's approval |
| Merit Committee (RIT) | `merit2@rit.example.edu.pk` | Approval of merit list 3 under the four-eyes rule |
| Applicant | `ayesha.noor@example.com` | CVU application under review; selected in RIT merit list 2 with an open offer |
| Applicant | `zainab.tariq@example.com` | Enrolled at RIT, with registration number and admission letter |
| Applicant | `mahnoor.fatima@example.com` | On the RIT waiting list |
| Applicant | `danish.iqbal@example.com` | Not selected at RIT, with programs suggested by the Admission Advisor |
| Applicant | `bilal.ahmed@example.com` | CVU application verified |
| Applicant | `sara.khan@example.com` | Marks mismatch during document verification |
| Applicant | `hamza.ali@example.com` | Proof of payment waiting for verification |

### Demo Data

The sample dataset includes:

- A complete admission cycle at Riverside Institute of Technology.
- 76 applications.
- Three merit lists.
- Offers, acceptances, admission-fee records, and enrollment.
- Expired and declined offers.
- One admission revocation.
- A Reference Directory containing 18 institutions and three years of historical closing merit data.

All institutions, people, and figures in the sample dataset are fictional and exist exclusively for development and demonstration.

The demo seed command is refused in production.

## 6. Available Scripts

### Backend

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API in development mode with automatic restart |
| `npm test` | Run API tests (downloads a MongoDB test server on first execution) |
| `npm run seed:demo` | Clear the database and load complete demonstration data |
| `npm run build` | Generate the production backend build |
| `npm start` | Start the production backend |
| `npm run lint` | Run backend lint checks |
| `npm run typecheck` | Run TypeScript type checks |
| `npm run test:perf` | Run performance checks PERF-2 to PERF-10 |
| `npm run docs:api` | Regenerate the OpenAPI document |
| `npm run backup` | Back up the database and uploaded files |
| `npm run restore -- <folder> --yes` | Restore a database and uploads backup |

**Backup retention:** Backups are retained for 14 days.

### Frontend

| Command | Purpose |
|---|---|
| `npm run dev` | Start the frontend development server |
| `npm run test:e2e` | Run Playwright and axe accessibility tests on phone and desktop |
| `npm run build` | Generate the production frontend build |
| `npm start` | Start the production frontend |
| `npm run lint` | Run frontend lint checks |
| `npm run typecheck` | Run TypeScript type checks |

The end-to-end tests require the application to be running with the `seed:demo` data loaded.

## 7. Development Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation, SaaS core, and design system | Complete |
| 2 | Applicant portal, verified marks, and admission operations | Complete |
| 3 | Merit, enrollment, Admission Advisor, and Result Finder | Complete |
| 4 | Analytics, support, quality, and delivery | Complete |

### Phase 1 — Foundation, SaaS Core and Design System

**Requirements:** AUTH-1 to AUTH-7, INST-1 to INST-5, PROG-1 to PROG-4, and CAMP-1 to CAMP-3.

Implemented functionality:

- Registration and login with email verification.
- Rotating refresh tokens.
- Account lockout and password reset.
- Staff invitations and role-based access control.
- Institution onboarding and subscription plans.
- Institution limits, grace periods, and suspension.
- Campus, faculty, department, session, and program management.
- Admission campaigns with status rules.
- Public institution website.
- Responsive design system with light and dark themes.

### Phase 2 — Applicant Portal, Verified Marks and Admission Operations

**Requirements:** PROF, MARK-1 to MARK-9, MARK-13, REG, APP, DOC, FEE, FLOW, and NOTIF.

Implemented functionality:

- Applicant profile with data export and account deletion.
- Subject-wise academic records.
- Academic record integrity checks, version history, and trust levels 0–3.
- Board Result Registry with CSV and Excel imports.
- Import preview, validation error reports, and seven-day rollback by the Super Admin.
- Institution-managed entry-test results and automatic matching.
- Officer verification panel and fraud flags.
- Document requirements, uploads, and review.
- Four-step application wizard.
- PDF fee challans, payment proofs, verification, and PDF receipts.
- CSV payment export.
- Application workflow with preconditions, deficiency notices, and withdrawal.
- Real-time in-app notifications using Socket.IO.
- Editable email templates.

Uploaded files are stored in `backend/storage/`, outside the frontend web root. Files are accessible only to their owners and authorized staff of the relevant institution.

### Phase 3 — Merit, Enrollment, Admission Advisor and Result Finder

**Requirements:** MARK-10 to MARK-12, MERIT-1 to MERIT-6, OFFER-1 to OFFER-5, DIR-1 to DIR-8, PRED-1 to PRED-12, and FIND-1 to FIND-8.

Implemented functionality:

**Merit Formula Management**
- Versioned merit formulas.
- Formula test mode.
- Active and proposed formula versions.
- Evaluation before formula activation.

**Merit Calculation and Lists**
- Merit engine with aggregate calculations and line-by-line breakdowns.
- Tie-breaker rules.
- Stable seat allocation using deferred acceptance.
- Merit calculations based only on verified marks.
- Merit-list generation and four-eyes approval.
- Publication through a transaction.
- Merit-list revisions and waiting lists.

**Offers and Enrollment**
- Offers with deadlines and automatic expiry.
- Admission-fee challans.
- Offer acceptance and decline.
- Enrollment with registration numbers.
- Admission letter generation.
- Original-document checks on reporting day.
- Admission revocation with an optional CNIC block.

**Reference Directory**
- Institution records and historical closing merit.
- Data entry through forms and CSV imports.
- Record verification and claims.
- Data-gap reporting.
- Automatic directory updates when merit lists are published.

**Admission Advisor**
- Admission chance estimation using three years of closing merit data.
- Safe, Target, Reach, and Unlikely categories.
- Explanations behind predictions.
- What-if analysis.
- Program shortlisting and comparison.
- PDF shortlist export.
- Indicative standing.
- Anonymous usage logging.

**Result Finder**
- My Results.
- Public merit lists with search and PDF export.
- Application status lookup with CAPTCHA.

### Phase 4 — Analytics, Support, Quality and Delivery

**Requirements:** RPT-1 to RPT-3, SUP-1 to SUP-3, and Section 5 covering performance, safety, security, and quality.

Implemented functionality:

**Institution Analytics and Reports**
- Institution analytics dashboard.
- Admission funnel visualization.
- Daily application submissions for 14-day and 30-day periods.
- Applications and applicants per available seat.
- Fee totals.
- Document rejection rate.
- Share of verified academic marks.
- Analytics caching for a maximum of 30 seconds.
- CSV and PDF reports for applications, payments, and merit lists.

**Platform Analytics**
- Platform-level analytics for the Super Admin.
- Admission Advisor usage statistics by program.
- Board Result Registry match-rate reporting.

**Support Ticket System**
- Support ticket categories and priorities.
- First-response targets of 2, 8, 24, and 72 hours.
- Five ticket statuses.
- Threaded replies and notifications to the other party.
- Institution-level ticket privacy, ensuring tickets are visible only to their respective institution and authorized platform staff.

**Audit Log**
- Institution-level audit log.
- Platform-level audit log.
- Audit filtering.
- CSV export.

**API Documentation**
- OpenAPI 3.1 document generated from API routers.
- Swagger UI available at `/api/v1/docs`.

**Backup and Restore**
- Database and uploaded-file backups.
- Database and upload restoration.
- Automatic backup retention for 14 days.

**Quality Assurance and Security**
- 90 API tests.
- Performance checks covering PERF-1 to PERF-10.
- Playwright end-to-end testing on phone and desktop.
- axe-core accessibility checks.
- WCAG 2.2 AA accessibility validation, with no serious or critical accessibility issues on tested screens.
- Security review covering user-text escaping in emails, CSV formula injection, and dependency auditing.
- Production build validation.
- Pointer cursor behavior for clickable elements.
- Placeholder text for form fields.

**Final Project Deliverables**
- Final project report in Word and PDF formats.
- User manuals.
- Requirements traceability matrix.
- Real screenshots of application screens in desktop, mobile, and dark-theme layouts.

## 8. Responsive Design and Accessibility

ADMITRA uses the available screen width with responsive padding and layouts.

The application is designed and checked across:

- Mobile phones.
- Tablets.
- Laptops.
- Large desktop monitors.

Framer Motion is used for interface animations. Animations respect the operating system's reduced-motion preference.

Accessibility testing includes axe-core and WCAG 2.2 AA checks as part of the end-to-end testing process.

## 9. File Storage and Security

- Uploaded files are stored in `backend/storage/`, outside the frontend web root.
- File access is restricted to the owner and authorized staff of the relevant institution.
- Authentication uses JWT-based sessions and rotating refresh tokens.
- Passwords are protected using Argon2id.
- API security includes Helmet and input validation using Zod.
- Audit logs provide visibility into important institution and platform activities.
- CSV exports are reviewed for formula-injection risks.
- User-provided text in emails is handled with appropriate escaping.

## 10. Testing and Production Readiness

The project includes backend unit/API testing, performance checks, and frontend end-to-end testing.

Before production deployment:

1. Configure production environment variables and secrets.
2. Use a properly secured MongoDB replica set.
3. Configure SMTP for email delivery.
4. Run backend and frontend lint and type-check commands.
5. Execute API and end-to-end tests.
6. Run the production builds.
7. Verify backup and restore procedures.
8. Review access controls, uploaded-file permissions, and audit logging.

**Important:** Never use the demo seed command on a production database because it clears existing data and loads fictional demonstration records.

---

**ADMITRA — Online Admission System**  
Final Year Project | Department of Computer Science  
Government College University Faisalabad