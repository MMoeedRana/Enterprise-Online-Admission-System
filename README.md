# ADMITRA — Online Admission System

**Final Year Project**  
Department of Computer Science, Government College University Faisalabad

ADMITRA is a multi-institution online admission platform that enables colleges and universities to manage their admissions through separate, secure workspaces. Students maintain a single profile and can use it to apply to multiple participating institutions.

The platform provides institution management, applicant registration, academic record verification, admission applications, merit processing, enrollment management, admission guidance, and result discovery.

## Project Structure

```text
ADMITRA/
├── backend/                 # Express.js 5 REST API
│   ├── ...
│   └── storage/             # Private uploaded files
│
├── frontend/                # Next.js 16 web application
│   └── ...
│
├── README.md
└── .gitignore
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 |
| UI and Data | TanStack React Query 5, Axios, React Hook Form, Zod, Recharts, Framer Motion, Lucide icons |
| Backend | Node.js, Express.js 5, TypeScript, Mongoose 9, Zod |
| Authentication | JWT, Argon2id |
| Security and Logging | Helmet, Pino |
| Communication | Nodemailer, Socket.IO |
| Documents and Data | PDFKit, Multer, Papa Parse, ExcelJS |
| Database | MongoDB 8 Community Server (single-node replica set), MongoDB Compass |
| Testing | Vitest, Supertest |

## 1. Prerequisites

Install the following before running ADMITRA:

- Node.js 22 or newer (Node.js 26 LTS recommended)
- npm
- MongoDB 8 Community Server
- MongoDB Compass

## 2. MongoDB Replica Set Setup

ADMITRA uses MongoDB transactions, which require a replica set. A single-node replica set is sufficient for local development.

### Windows

1. Open the MongoDB configuration file as Administrator:

   ```text
   C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg
   ```

2. Add the following configuration:

   ```yaml
   replication:
     replSetName: rs0
   ```

3. Open Windows Services, find **MongoDB Server**, and restart the service.

4. Open MongoDB Compass and connect using:

   ```text
   mongodb://127.0.0.1:27017/?directConnection=true
   ```

5. Open the MongoDB shell (MONGOSH) and run this command once:

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

Initialize the replica set:

```bash
mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })"
```

After initialization, use the following connection string:

```text
mongodb://127.0.0.1:27017/admitra?replicaSet=rs0
```

## 3. Backend Setup

Open a terminal in the project root and navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create your local environment file by copying `.env.example` to `.env`.

Configure the MongoDB connection and other environment variables if required.

### Load the complete demonstration dataset

To create the Super Admin, subscription plans, sample institutions, applicants, merit lists, and reference directory data, run:

```bash
npm run seed:demo
```

**Important:** The demo seed command clears the existing database before loading the complete sample dataset. It takes approximately 30 seconds and should only be used in development.

For a clean installation without demonstration records, run:

```bash
npm run seed
```

This creates the Super Admin and subscription plans. Dashboards will initially show empty data until records are added.

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

During development, verification, invitation, and password-reset email links are printed in the backend terminal. To receive emails in an inbox, configure SMTP settings in `.env` (for example, Mailpit on `127.0.0.1:1025`).

## 4. Frontend Setup

Open a separate terminal in the project root:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create `.env.local` by copying `.env.example`.

Start the frontend development server:

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

Frontend requests to `/api/v1` are forwarded to the backend API.

## 5. Sample Accounts

The following sample accounts are available after running:

```bash
npm run seed:demo
```

All sample accounts use the password `Admitra@123`, except the Super Admin, which uses the password configured in `.env`.

| Role | Email | What to Explore |
|---|---|---|
| Super Admin | admin@admitra.local | Institutions, plans, registry imports, Reference Directory, verification queue, data gaps, claims, and Admission Advisor usage |
| Institution Admin (Crescent Valley University) | admin@cvu.example.edu.pk | Fall 2026 campaign, applications, and directory data |
| Admission Officer (CVU) | officer@cvu.example.edu.pk | Application review and marks verification |
| HOD Officer, Computer Science (CVU) | hod.cs@cvu.example.edu.pk | Applications belonging to the Computer Science department |
| Finance Officer (CVU) | finance@cvu.example.edu.pk | Payment verification |
| Merit Committee (CVU) | merit1@cvu.example.edu.pk | Active merit formulas and proposed BSCS formula version 2 |
| Institution Admin (Riverside Institute of Technology) | admin@rit.example.edu.pk | Merit publication, revocation, offers, and enrollment |
| Admissions and Accounts (RIT) | officer@rit.example.edu.pk | Admission-fee proofs and original-document checks |
| Merit Committee (RIT) | merit1@rit.example.edu.pk | Generated merit list 3 awaiting the second member's approval |
| Merit Committee (RIT) | merit2@rit.example.edu.pk | Second-member approval under the four-eyes rule |
| Applicant | ayesha.noor@example.com | CVU application under review and an open RIT offer from merit list 2 |
| Applicant | zainab.tariq@example.com | RIT enrollment, registration number, and admission letter |
| Applicant | mahnoor.fatima@example.com | RIT waiting-list status |
| Applicant | danish.iqbal@example.com | RIT non-selection and Admission Advisor program suggestions |
| Applicant | bilal.ahmed@example.com | Verified CVU application |
| Applicant | sara.khan@example.com | Marks mismatch during document verification |
| Applicant | hamza.ali@example.com | Payment proof awaiting verification |

### Demonstration Dataset

The sample dataset includes:

- A complete admission cycle at Riverside Institute of Technology.
- 76 applications and three merit lists.
- Admission offers, acceptances, admission fees, and enrollment records.
- Expired and declined offers.
- One revocation scenario.
- A Reference Directory containing 18 institutions and three years of closing merit history.

Every institution, person, and figure in the sample dataset is fictional and exists only for development and demonstration.

The demo seed command is refused in production.

## 6. Available Scripts

### Backend

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API with automatic restart |
| `npm test` | Run backend tests (downloads a MongoDB test server on first execution) |
| `npm run seed` | Create the Super Admin and subscription plans |
| `npm run seed:demo` | Clear the database and load the complete demonstration dataset |
| `npm run build` | Build the production backend |
| `npm start` | Start the production backend |
| `npm run lint` | Run lint checks |
| `npm run typecheck` | Run TypeScript checks |

### Frontend

| Command | Purpose |
|---|---|
| `npm run dev` | Start the frontend development server |
| `npm run build` | Build the production frontend |
| `npm start` | Start the production frontend |
| `npm run lint` | Run lint checks |
| `npm run typecheck` | Run TypeScript checks |

## 7. Development Status

| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Foundation, SaaS Core and Design System | Complete |
| Phase 2 | Applicant Portal, Verified Marks and Admission Operations | Complete |
| Phase 3 | Merit, Enrollment, Admission Advisor and Result Finder | Complete |
| Phase 4 | Analytics, Support, Quality and Delivery | Planned |

## 8. Implemented Features

### Phase 1 — Foundation, SaaS Core and Design System

- User registration and login with email verification.
- Rotating refresh tokens, account lockout, and password reset.
- Staff invitations and role-based access control.
- Institution onboarding and subscription plans.
- Plan limits, grace periods, and institution suspension.
- Campus, faculty, department, academic session, and program management.
- Admission campaign creation and status management.
- Public-facing institution and admission pages.
- Responsive interface with light and dark themes.

### Phase 2 — Applicant Portal, Verified Marks and Admission Operations

**Applicant Profile and Academic Records**

- Centralized applicant profiles with personal and academic information.
- Applicant data export and account deletion.
- Subject-wise academic records.
- Academic record integrity checks and version history.
- Academic record trust levels from 0 to 3.

**Board Result Registry and Marks Verification**

- Board result registry for storing academic examination records.
- CSV and Excel registry imports.
- Import preview and validation error reports.
- Seven-day rollback facility for registry imports by the Super Admin.
- Institution-managed entry-test results.
- Automatic matching of applicant academic records against registry data.

**Document Verification**

- Admission officer verification panel.
- Academic marks verification and mismatch detection.
- Fraud flags and verification status tracking.
- Institution-specific document requirements.
- Secure document uploads and review workflows.

**Admission Application Management**

- Four-step application wizard.
- Program and admission campaign selection.
- Application submission and status tracking.
- Application workflow with defined preconditions.
- Deficiency notices and application withdrawal.

**Fee Management**

- Fee challan generation in PDF format.
- Proof-of-payment uploads.
- Payment verification by authorized staff.
- Payment receipts in PDF format.
- CSV export of fee records.

**Notifications and Communication**

- Real-time in-app notifications using Socket.IO.
- Editable email templates.
- Email notifications for relevant admission events.

### Phase 3 — Merit, Enrollment, Admission Advisor and Result Finder

**Merit Formula Management**

- Versioned merit formulas with a test mode.
- Active and proposed formula versions.
- Formula evaluation before activation.
- Configurable merit calculation rules.

**Merit Engine and Seat Allocation**

- Merit aggregate calculation with a line-by-line breakdown.
- Tie-breaker rules for equal merit scores.
- Stable seat allocation using the deferred acceptance algorithm.
- Merit calculations based only on verified academic marks.

**Merit Lists and Approval**

- Merit list generation and revision management.
- Four-eyes approval requiring two authorized committee members.
- Transaction-based merit list publication.
- Waiting-list management.
- Controlled publication and revision workflows.

**Admission Offers and Enrollment**

- Admission offers with acceptance deadlines.
- Automatic expiry of overdue offers.
- Admission-fee challan generation.
- Offer acceptance and decline workflows.
- Student enrollment with registration number generation.
- Admission letter generation.
- Original-document verification on reporting day.
- Admission revocation with an optional CNIC block.

**Reference Directory**

- Institution reference directory.
- Historical closing merit records.
- Merit history from forms and CSV imports.
- Data verification and claims management.
- Data-gap reporting.
- Automatic reference-directory updates when a merit list is published.

**Admission Advisor**

- Admission chance estimation based on three years of historical closing merit.
- Four chance categories: Safe, Target, Reach, and Unlikely.
- Explanations behind predicted admission chances.
- What-if analysis for exploring alternative academic scenarios.
- Program shortlisting and comparison.
- PDF export of shortlisted programs.
- Indicative merit standing.
- Anonymous usage logging.

**Result Finder and Public Results**

- Applicant-facing My Results section.
- Public merit lists with search functionality.
- PDF merit list exports.
- Application and admission status lookup.
- CAPTCHA-protected public status lookup.

## 9. Interface and Responsive Design

ADMITRA uses a responsive, full-width interface designed for different screen sizes.

- Responsive layouts for phones, tablets, laptops, and large monitors.
- Consistent spacing and adaptable page layouts.
- Animated cards, figures, and page transitions using Framer Motion.
- Animations respect the operating system's reduced-motion preference.
- Light and dark themes across the application.

## 10. File Storage and Security

Applicant documents and uploaded files are stored in:

```text
backend/storage/
```

Uploaded files are stored outside the frontend web root and are accessible only to their authorized owners and permitted staff members of the relevant institution.

The local storage directory is excluded from Git tracking to prevent uploaded documents and private files from being committed to the repository.

## 11. Project Scope and Future Development

ADMITRA is being developed as a multi-institution admission management platform with separate institutional workspaces, centralized applicant profiles, and role-based access.

Phases 1, 2, and 3 establish the platform foundation, core admission operations, merit processing, enrollment, and admission guidance.

Phase 4 is planned to focus on analytics, support, quality assurance, security validation, and final delivery.

---

**ADMITRA — Online Admission System**  
Final Year Project | Department of Computer Science  
Government College University Faisalabad