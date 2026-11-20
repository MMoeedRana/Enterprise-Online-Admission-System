# ADMITRA — Online Admission System

**Final Year Project**  
Department of Computer Science, Government College University Faisalabad

ADMITRA is a multi-institution online admission platform that enables colleges and universities to manage their admissions through separate, secure workspaces. Students maintain a single profile and can use it to apply to multiple participating institutions.

The platform provides institution management, applicant registration, academic record verification, admission applications, document review, fee processing, and admission workflow management.

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
| UI and Data | TanStack React Query 5, Axios, React Hook Form, Zod, Recharts, Lucide |
| Backend | Node.js, Express.js 5, TypeScript, Mongoose 9, Zod |
| Authentication | JWT, Argon2id |
| Security and Logging | Helmet, Pino |
| Communication | Nodemailer, Socket.IO |
| Documents and Data | PDFKit, Multer, Papa Parse, ExcelJS |
| Database | MongoDB 8 Community Server, MongoDB Compass |
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

5. Open the MongoDB shell (MONGOSH) and run the following command once:

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

Configure the MongoDB connection and other environment variables if required. The default local development settings should be used as the starting point.

Seed the database with the Super Admin, subscription plans, and sample institutions:

```bash
npm run seed -- --sample
```

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

During development, verification, invitation, and password-reset email links are printed in the backend terminal. To receive emails in an inbox, configure SMTP settings in `.env`.

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
npm run seed -- --sample
```

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@admitra.local | Admin@12345 (configured in `.env`) |
| Institution Admin | admin@cvu.example.edu.pk | Admitra@123 |
| Admission Officer | officer@cvu.example.edu.pk | Admitra@123 |
| HOD Officer | hod.cs@cvu.example.edu.pk | Admitra@123 |
| Finance Officer | finance@cvu.example.edu.pk | Admitra@123 |
| Merit Committee | merit1@cvu.example.edu.pk | Admitra@123 |
| Applicant | ayesha.noor@example.com | Admitra@123 |
| Applicant | bilal.ahmed@example.com | Admitra@123 |
| Applicant | sara.khan@example.com | Admitra@123 |
| Applicant | hamza.ali@example.com | Admitra@123 |

The applicant accounts represent different application and verification scenarios, including fee verification, application review, marks mismatch, and pending payment verification.

All sample institutions and applicant records are fictional and intended only for development and demonstration.

**Reset sample data (development only):**

```bash
npm run seed -- --reset --sample
```

This command clears the database and recreates the sample data. It must only be used in a development environment.

## 6. Available Scripts

### Backend

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API in development mode |
| `npm test` | Run backend tests |
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
| Phase 3 | Merit, Enrollment, Admission Advisor and Result Finder | Planned |
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

## 9. File Storage and Security

Applicant documents and uploaded files are stored in:

```text
backend/storage/
```

Uploaded files are stored outside the frontend web root and are accessible only to their authorized owners and permitted staff members of the relevant institution.

The local storage directory is excluded from Git tracking to prevent uploaded documents and private files from being committed to the repository.

## 10. Project Scope

ADMITRA is being developed as a multi-institution admission management platform with separate institutional workspaces, centralized applicant profiles, and role-based access.

The completed phases establish the platform foundation and core admission operations. Future development phases will extend the system with merit processing, enrollment management, admission assistance, analytics, support, and final delivery activities.

---

**ADMITRA — Online Admission System**  
Final Year Project | Department of Computer Science  
Government College University Faisalabad
