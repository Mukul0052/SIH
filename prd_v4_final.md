# PRD v4.0 — Agent Build Specification (Backend + Stitch MCP UI Generation)
## Unified Legal Metrology Verification & Digital Certification System

**Purpose of this document:** This is written to be handed directly to AI coding agents (e.g. in Antigravity) as the single source of truth for building the entire system — backend, data layer, **and** UI, with the UI generated via the connected **Stitch MCP tool**. Read this document fully before writing any code or generating any design. Do not invent field names, endpoints, screens, or business rules not defined here — if something is genuinely ambiguous, mark it `TODO: confirm` in code comments rather than guessing.

### Instructions for the agent on Stitch MCP usage
- For every screen listed in **Part M**, call the Stitch MCP design tool to generate the UI, providing it: the screen's purpose, the role it belongs to, the data it displays, the actions available on it, and — critically — **the current workflow state rules from Part C** so generated screens only show actions that are actually valid for that application status and that user's role (e.g. don't render an "Approve" button for a GATC user, don't show "Start Inspection" on an application still in `under_review`).
- Generate screens role-by-role, in the same order as Part M, so the design system stays consistent as it builds up (start with shared/auth screens, then Owner, then LMO/GATC, then Admin, then Regulatory, then the public verification page).
- After Stitch generates each screen, wire it to the exact API endpoint(s) referenced for that screen in Part M (which map back to Part F). Do not alter request/response field names to match whatever Stitch's generated component naming defaults to — keep the API contract in Part F as the source of truth and adapt the frontend code to it.
- Where a screen needs to reflect the application status stepper (Part C.1), generate it as a visible progress indicator using the exact status enum values, not paraphrased labels, so status strings stay consistent between backend and UI.

**Stack (locked, do not substitute):**
- Frontend: React + TypeScript (UI designed in Stitch, wired up separately)
- Backend: FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy (async), Alembic migrations
- Database: Supabase (PostgreSQL)
- File storage: Supabase Storage
- Auth: Supabase Auth
- Deployment: Vercel

---

## PART A — PRODUCT CONTEXT (why the system exists)

### A.1 What this is
A platform digitizing the lifecycle of weighing/measuring instrument verification under India's **Legal Metrology Act, 2009** and **Legal Metrology (General) Rules, 2011**. It does **not** replace physical inspection by Legal Metrology Officers (LMOs) or Government Approved Test Centres (GATCs) — it manages, guides, calculates, certifies, and tracks around that human activity. Reference for model approvals: https://lm.doca.gov.in/modelapproval/Certificates.aspx

### A.2 Core principle (must shape every design decision)
> The system provides decision support. A human officer's authorized decision is always the final, legally significant step. Automated PASS/FAIL evaluation must never be presented or stored as equivalent to the officer's final Approved/Rejected decision — these are two distinct fields, always.

### A.3 The end-to-end workflow (plain language)
1. An instrument owner (shopkeeper/business) registers an account and their instrument.
2. They submit a verification or re-verification application.
3. An Administrator schedules it and assigns an LMO or GATC.
4. The officer performs the physical inspection and enters observations into the app.
5. The system automatically calculates error values and evaluates them against configured legal tolerances, showing an automated result (PASS/FAIL/WARNING/REVIEW REQUIRED).
6. An authorized person makes the final decision (Approved/Rejected) — separate from the automated result.
7. If approved, the system generates a signed digital certificate with a QR code, stores it, and notifies the owner.
8. The system tracks the certificate's validity period and sends expiry reminders, prompting re-verification (loop back to step 2).

### A.4 Regulatory basis
All permissible-error values, test procedures, and validity periods must come from the Legal Metrology (General) Rules, 2011 and its schedules — never invented. Where a specific numeric limit is not yet supplied by the product owner, seed the `rules` table row with `permissible_limits: {"status": "PENDING_LEGAL_INPUT"}` rather than a guessed number, and surface this clearly in any admin UI that reads it.

---

## PART B — ROLES & PERMISSIONS

### B.1 Roles
`owner`, `lmo`, `gatc`, `admin`, `regulatory`

### B.2 Registration behavior per role
- **owner**: self-registers, verifies via OTP (email or phone), account active immediately.
- **lmo**: self-registers with employee ID + department + jurisdiction fields → account created with `status = pending_approval` → cannot be assigned work until an `admin` sets `status = active`.
- **gatc**: same pattern as `lmo`, with GATC notification/license reference field instead of employee ID.
- **admin**: never self-registered. Created only by a seeded super-admin account or by an existing `admin`.
- **regulatory**: created only by an `admin`, scoped to one or more `jurisdiction` values.

### B.3 Permission matrix (enforce server-side via FastAPI dependencies, not just UI hiding)

| Action | owner | lmo | gatc | admin | regulatory |
|---|---|---|---|---|---|
| Register own account | ✅ | ✅ (pending) | ✅ (pending) | ❌ | ❌ |
| Approve lmo/gatc registration | ❌ | ❌ | ❌ | ✅ | ❌ |
| Register instrument | ✅ own only | ❌ | ❌ | ✅ any | ❌ |
| Submit application | ✅ own instruments | ❌ | ❌ | ✅ | ❌ |
| Schedule/assign application | ❌ | ❌ | ❌ | ✅ | ❌ |
| Enter test observations | ❌ | ✅ if assigned | ✅ if assigned | ❌ | ❌ |
| Approve/reject final decision | ❌ | ✅ per §C.4 | ❌ | ✅ per §C.4 | ❌ |
| View own certificates/history | ✅ | ✅ own actions | ✅ own actions | ✅ all | ✅ jurisdiction |
| Manage rules library | ❌ | ❌ | ❌ | ✅ | ❌ |
| View audit logs | ❌ | ❌ | ❌ | ✅ full | ✅ jurisdiction read-only |
| Public: view certificate via QR | n/a — no login required, separate public endpoint |

---

## PART C — WORKFLOW STATE MACHINE (implement exactly as specified)

### C.1 Application statuses (enum, in this exact order of typical progression)
```
draft, submitted, under_review, scheduled, assigned,
inspection_pending, testing_in_progress, results_submitted,
approved, rejected, certificate_generated, closed
```

### C.2 Allowed transitions
```
draft            -> submitted            (actor: owner)
submitted        -> under_review         (actor: system, auto after required-field validation)
under_review     -> draft                (actor: admin, "return for more info")
under_review     -> scheduled            (actor: admin)
scheduled        -> assigned             (actor: admin)
assigned         -> inspection_pending   (actor: assigned lmo/gatc)
inspection_pending -> testing_in_progress (actor: assigned lmo/gatc)
testing_in_progress -> results_submitted (actor: assigned lmo/gatc)
results_submitted -> approved            (actor: authorized approver, see §C.4)
results_submitted -> rejected            (actor: authorized approver, see §C.4)
approved         -> certificate_generated (actor: system, automatic)
certificate_generated -> closed          (actor: system, automatic)
rejected         -> closed               (actor: system, automatic)
[any of: scheduled, assigned, inspection_pending, testing_in_progress] -> assigned
                                          (actor: admin, "reassign", records reason)
```
Any transition attempted outside this table must return HTTP 409 Conflict with an explanit error message. Every transition writes one `audit_logs` row.

### C.3 Automated evaluation vs. final decision (must be two separate fields, always)
- `tests.automated_result` — one of `PASS, FAIL, WARNING, REVIEW_REQUIRED` — written by the calculation engine, never editable by a human.
- `applications.final_decision` — one of `approved, rejected, null` — written only by the authorized approver action. The API and UI must always display both fields side by side, never merge them into one status.

### C.4 Approval authority rule
- If `applications.assigned_officer_role == 'lmo'`: that LMO is the authorized approver.
- If `applications.assigned_officer_role == 'gatc'`: the GATC cannot self-approve. The application must be routed to a supervising LMO or an admin (configurable per jurisdiction in a `jurisdiction_config` table — see schema) for the final decision.
- Enforce this in the `POST /applications/{id}/decision` endpoint: reject with 403 if the caller is a GATC user attempting to approve their own submission.

---

## PART D — CALCULATION & RULES ENGINE

### D.1 Calculation logic (example — implement generically, driven by `rules.calculation_formula`)
```
error = observed_value - standard_value
if abs(error) <= permissible_limit: automated_result = "PASS"
elif abs(error) <= permissible_limit * warning_multiplier: automated_result = "WARNING"
else: automated_result = "FAIL"
```
`warning_multiplier` is a configurable field per rule (default 1.0, meaning no WARNING band, only PASS/FAIL, unless the product owner specifies otherwise).

### D.2 Rule versioning (critical — do not skip)
- Every `tests` row stores the exact `rule_id` (with its version) used at calculation time.
- Updating a rule creates a **new row** with an incremented `version` and a new `effective_date` — never mutate an existing rule row's `permissible_limits` or `calculation_formula` in place. Old test records must always resolve to the rule version active when they were performed.

### D.3 Instrument category seed list (use as the initial `instrument_categories` table seed)
```
Non-automatic weighing instrument
Automatic Gravimetric Filling Instrument
Discontinuous Totalizing Automatic Weighing Instrument (Hopper weigher)
Catch Weighing Instrument (Check Weigher)
Automatic instruments for weighing road vehicles in-motion and measuring axle loads
Electronic Tank Weighing type
Water Meter
Gas Meters
Flow Meters
Measuring Systems for Liquids Other than Water
Measuring tape
Auto Rickshaw and Taxi Meter
Sphygmomanometer (Blood Pressure Meter)
Liquor measures
Any other Weight or Measure
```

---

## PART E — DATABASE SCHEMA (PostgreSQL DDL — implement exactly, adjust only syntax errors)

```sql
CREATE TYPE user_role AS ENUM ('owner', 'lmo', 'gatc', 'admin', 'regulatory');
CREATE TYPE user_status AS ENUM ('pending_approval', 'active', 'suspended');
CREATE TYPE application_status AS ENUM (
  'draft', 'submitted', 'under_review', 'scheduled', 'assigned',
  'inspection_pending', 'testing_in_progress', 'results_submitted',
  'approved', 'rejected', 'certificate_generated', 'closed'
);
CREATE TYPE verification_type AS ENUM ('initial', 're_verification');
CREATE TYPE automated_result AS ENUM ('PASS', 'FAIL', 'WARNING', 'REVIEW_REQUIRED');
CREATE TYPE final_decision AS ENUM ('approved', 'rejected');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  organization VARCHAR(255),
  jurisdiction VARCHAR(100),
  employee_or_license_ref VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role_status ON users(role, status);

CREATE TABLE instrument_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) UNIQUE NOT NULL,
  default_validity_months INT NOT NULL DEFAULT 12
);

CREATE TABLE instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number VARCHAR(100) NOT NULL,
  category_id UUID NOT NULL REFERENCES instrument_categories(id),
  type VARCHAR(150),
  manufacturer VARCHAR(200),
  model VARCHAR(150),
  capacity NUMERIC(12,3),
  capacity_unit VARCHAR(20),
  accuracy_class VARCHAR(20),
  owner_id UUID NOT NULL REFERENCES users(id),
  location_address TEXT,
  gps_lat NUMERIC(9,6),
  gps_lng NUMERIC(9,6),
  previous_certificate_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(serial_number, owner_id)
);
CREATE INDEX idx_instruments_owner ON instruments(owner_id);
CREATE INDEX idx_instruments_serial ON instruments(serial_number);

CREATE TABLE jurisdiction_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction VARCHAR(100) UNIQUE NOT NULL,
  gatc_approval_routes_to VARCHAR(20) NOT NULL DEFAULT 'lmo' -- 'lmo' or 'admin'
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(30) UNIQUE NOT NULL, -- e.g. LM-2026-00125
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  applicant_id UUID NOT NULL REFERENCES users(id),
  verification_type verification_type NOT NULL,
  status application_status NOT NULL DEFAULT 'draft',
  jurisdiction VARCHAR(100),
  submission_date TIMESTAMPTZ,
  scheduled_date TIMESTAMPTZ,
  assigned_officer_id UUID REFERENCES users(id),
  assigned_officer_role user_role,
  final_decision final_decision,
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_assigned ON applications(assigned_officer_id);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);

CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES instrument_categories(id),
  version INT NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  procedure_reference VARCHAR(255),
  test_type VARCHAR(150) NOT NULL,
  calculation_formula VARCHAR(50) NOT NULL DEFAULT 'observed_minus_standard',
  permissible_limits JSONB NOT NULL, -- e.g. {"max_abs_error": 0.05, "unit": "kg"} or {"status":"PENDING_LEGAL_INPUT"}
  warning_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  legal_source_reference VARCHAR(255),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, test_type, version)
);

CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id),
  rule_id UUID NOT NULL REFERENCES rules(id),
  test_type VARCHAR(150) NOT NULL,
  standard_value NUMERIC(14,4),
  observed_value NUMERIC(14,4),
  calculated_error NUMERIC(14,4),
  automated_result automated_result,
  remarks TEXT,
  entered_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tests_application ON tests(application_id);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number VARCHAR(40) UNIQUE NOT NULL,
  application_id UUID UNIQUE NOT NULL REFERENCES applications(id),
  qr_token VARCHAR(64) UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, revoked
  signature_payload JSONB NOT NULL,
  signature_value TEXT NOT NULL,
  pdf_storage_ref VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_certificates_qr_token ON certificates(qr_token);

CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id),
  test_id UUID REFERENCES tests(id),
  file_type VARCHAR(50),
  storage_ref VARCHAR(500) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  channel notification_channel NOT NULL,
  related_entity VARCHAR(50),
  related_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## PART F — REST API CONTRACT

Base path: `/api/v1`. All authenticated endpoints require `Authorization: Bearer <jwt>`. All list endpoints support `?page=&page_size=`. All responses use this error shape on failure:
```json
{ "error": { "code": "STRING_CODE", "message": "human readable" } }
```

### F.1 Auth
```
POST /auth/register          body: {name, email, phone, password, role, organization?, jurisdiction?, employee_or_license_ref?}
                              -> 201 {user_id, status}   (owner: status=active; lmo/gatc: status=pending_approval)
POST /auth/login             body: {email, password} -> 200 {access_token, refresh_token, user: {...}}
POST /auth/refresh           body: {refresh_token} -> 200 {access_token}
POST /auth/verify-otp        body: {email, otp} -> 200 {verified: true}
```

### F.2 Admin — user management
```
GET  /admin/users?status=pending_approval&role=lmo   -> 200 [ {id, name, role, status, ...} ]
POST /admin/users/{id}/approve                        -> 200 {id, status: "active"}
POST /admin/users/{id}/suspend                        -> 200 {id, status: "suspended"}
```

### F.3 Instruments
```
POST /instruments             body: {serial_number, category_id, manufacturer, model, capacity, capacity_unit,
                                      accuracy_class, location_address, gps_lat?, gps_lng?}
                               -> 201 {id, ...}   (403 duplicate warning if serial+owner exists -> 409)
GET  /instruments/{id}        -> 200 {...instrument, owner: {...}}
GET  /instruments?owner_id=&category_id=&search=      -> 200 [ {...} ]  (role-scoped: owner sees only own)
GET  /instruments/{id}/history -> 200 [ {application_id, status, certificate_number?, date} ]
```

### F.4 Applications
```
POST /applications             body: {instrument_id, verification_type} -> 201 {id, application_number, status: "draft"}
POST /applications/{id}/submit -> 200 {id, status: "submitted"}
GET  /applications/{id}        -> 200 {...full application incl. instrument, tests[], certificate?}
GET  /applications?status=&assigned_officer_id=&applicant_id=&jurisdiction=  -> 200 [ {...} ]
POST /applications/{id}/schedule   body: {scheduled_date, jurisdiction}       (admin only) -> 200
POST /applications/{id}/assign     body: {officer_id, officer_role}          (admin only) -> 200 {status:"assigned"}
POST /applications/{id}/reassign   body: {officer_id, officer_role, reason}  (admin only) -> 200
POST /applications/{id}/start-inspection    (assigned officer only) -> 200 {status:"inspection_pending"}
POST /applications/{id}/start-testing       (assigned officer only) -> 200 {status:"testing_in_progress"}
POST /applications/{id}/submit-results      (assigned officer only) -> 200 {status:"results_submitted"}
POST /applications/{id}/decision   body: {decision: "approved"|"rejected", remarks?}
                                    (authorized approver only, per §C.4) -> 200 {status, final_decision}
                                    -> 403 if caller is gatc attempting self-approval
```

### F.5 Tests
```
POST /applications/{id}/tests   body: {test_type, standard_value, observed_value, remarks?}
                                 -> 201 {id, calculated_error, automated_result, rule_version_used}
GET  /applications/{id}/tests   -> 200 [ {...} ]
```

### F.6 Evidence
```
POST /applications/{id}/evidence   multipart/form-data: file, test_id?  -> 201 {id, storage_ref}
GET  /applications/{id}/evidence   -> 200 [ {...} ]
```

### F.7 Rules (admin)
```
GET  /rules?category_id=&test_type=            -> 200 [ {...} ]
POST /rules   body: {category_id, test_type, permissible_limits, calculation_formula, effective_date,
                      legal_source_reference}   -> 201 {id, version}  (auto-increments version per category+test_type)
```

### F.8 Certificates
```
GET  /certificates/{id}            -> 200 {...} (owner: own only; admin/regulatory: any)
GET  /certificates/{id}/pdf        -> 200 binary PDF
GET  /public/verify/{qr_token}     -> 200 {certificate_number, instrument_type, verification_date,
                                            valid_until, status, authenticated: true|false}
                                       -- NO LOGIN REQUIRED. Must exclude owner personal contact details.
```

### F.9 Dashboards
```
GET /dashboard/owner        -> 200 {total_instruments, verified, pending_applications, expiring, expired, recent[]}
GET /dashboard/lmo          -> 200 {assigned, today, pending_inspections, completed, flagged, upcoming}
GET /dashboard/gatc         -> 200 {assigned, pending, completed, needs_review}
GET /dashboard/admin        -> 200 {totals, workload_by_officer, jurisdiction_stats, trends}
GET /dashboard/regulatory   -> 200 {jurisdiction_pendency, expiry_trends, enforcement_flags}
```

### F.10 Search
```
GET /search?application_id=&certificate_number=&serial_number=&owner=&type=&location=&date_from=&date_to=&lmo_id=&gatc_id=&status=
   -> 200 [ {...matching records, mixed types tagged by "record_type"} ]
```

### F.11 Audit
```
GET /audit-logs?entity=&entity_id=&user_id=&date_from=&date_to=   (admin: all; regulatory: jurisdiction-scoped read-only)
```

---

## PART G — CERTIFICATE GENERATION (implement exactly this pipeline)

Trigger: automatically inside the `POST /applications/{id}/decision` handler, only when `decision == "approved"`.

1. Assemble data via joined query: application + instrument + owner + officer + tests.
2. Generate `certificate_number` (format: `LM-CERT-{year}-{zero-padded sequence}`) and a random 32-char `qr_token`.
3. Build canonical JSON payload of core fields; sign with a server-held private key (`cryptography` library, RSA or ECDSA). Store `signature_payload` and `signature_value`.
4. Generate QR code (Python `qrcode` lib) encoding `https://{app_domain}/verify/{qr_token}` — never encode raw data in the QR itself.
5. Render PDF via WeasyPrint from an HTML/Jinja2 template containing: certificate number, application number, instrument details, owner details, verification date, result, validity date, officer/GATC details, embedded QR image.
6. Upload PDF to object storage; insert `certificates` row with the storage reference.
7. Insert `notifications` row to alert the owner; transition application to `certificate_generated` then `closed`.

**Important caveat to preserve in code comments:** this signature scheme authenticates within this system only — it is not a government-recognized Digital Signature Certificate (DSC). Do not claim otherwise in any UI copy or documentation the agent generates.

---

## PART H — CROSS-CUTTING RULES (apply everywhere)

- Every state-changing endpoint writes an `audit_logs` row: `user_id, action, entity, entity_id, old_value, new_value`.
- Every list/search endpoint enforces role-scoping at the query level (e.g. `owner` role always filters `WHERE owner_id = current_user.id`), never just at the UI.
- Never let an automated `PASS`/`FAIL` result auto-set `applications.final_decision` — that field is only ever written by the `/decision` endpoint.
- Rule records are immutable once created; corrections create a new version.
- All monetary/measurement values use `NUMERIC`, never `FLOAT`, to avoid rounding errors in legal calculations.
- Notifications triggers (implement as background jobs, e.g. APScheduler daily cron): expiry in 30 days, on expiry, re-verification due.

---

## PART I — PROJECT STRUCTURE (backend)

```
backend/
  app/
    main.py
    core/          # config, security (jwt, password hashing), dependencies (get_current_user, require_role)
    models/        # SQLAlchemy models, one file per table group
    schemas/       # Pydantic request/response models
    api/v1/        # routers: auth.py, instruments.py, applications.py, tests.py, certificates.py, rules.py, admin.py, dashboard.py, search.py
    services/      # business logic: certificate_service.py, calculation_service.py, notification_service.py
    db/            # session, base
  alembic/         # migrations
  tests/           # pytest, mirrors api/ structure
  requirements.txt
  .env.example
```

Frontend structure is intentionally left open since UI is designed in Stitch — wire generated components into a standard `src/api/`, `src/pages/`, `src/components/` React+TypeScript layout, calling the endpoints in Part F.

---

## PART J — PHASED BUILD PLAN (build and verify in this order — do not attempt everything in one pass)

**Phase 1 — Foundation**
- DB schema + migrations (Part E)
- Auth: register/login/refresh, role enum, JWT, password hashing
- Admin approval endpoints for lmo/gatc

**Phase 2 — Instruments & Applications**
- Instrument CRUD + duplicate detection
- Application creation + state machine transitions (Part C) with audit logging

**Phase 3 — Test & Rules Engine**
- Rules CRUD (admin) with versioning
- Test entry endpoint with calculation + automated_result logic (Part D)
- Decision endpoint enforcing approval authority rule (§C.4)

**Phase 4 — Certificates**
- Certificate generation pipeline (Part G)
- Public verification endpoint

**Phase 5 — Supporting features**
- Evidence upload, notifications (in-app + email), dashboards, search, audit log viewer

**Phase 6 — Hardening**
- Rate limiting, input validation edge cases, seed data script, basic test coverage of the state machine and calculation engine

Do not proceed to a phase until the previous phase's endpoints are working and covered by at least a basic manual or automated test — each phase depends on the previous one's data existing correctly.

---

## PART K — SEED DATA (minimum required for a working demo)

- 1 admin user (seeded directly in DB, not via API)
- 2 instrument categories with at least one fully-specified rule each (or explicitly `PENDING_LEGAL_INPUT`)
- 1 owner user + 1 instrument
- 1 lmo user, pre-approved (`status = active`) for demo convenience

---

## PART M — UI SCREENS FOR STITCH MCP GENERATION

For each screen below: generate via Stitch MCP using the stated purpose/data/actions, then wire to the listed endpoint(s) from Part F. Every screen must respect the role permission matrix (Part B.3) and, where relevant, the application state machine (Part C) — buttons/actions for a given status only appear if that transition is valid for the current user's role.

### M.1 Shared / Auth screens
| Screen | Purpose & key data | Actions | Endpoints |
|---|---|---|---|
| Login | Email + password form | Submit login | `POST /auth/login` |
| Register | Role-aware form: owner fields vs. lmo/gatc fields (employee/license ref, jurisdiction) | Submit registration; show "pending approval" message for lmo/gatc | `POST /auth/register` |
| OTP Verify | Single OTP input, resend link | Verify code | `POST /auth/verify-otp` |

### M.2 Instrument Owner screens
| Screen | Purpose & key data | Actions | Endpoints |
|---|---|---|---|
| Owner Dashboard | Widgets: total instruments, verified count, pending applications, expiring/expired certs, recent applications | Navigate to instruments/applications | `GET /dashboard/owner` |
| My Instruments | List of owned instruments with category, serial no., validity status badge | Search/filter; open detail; add new | `GET /instruments?owner_id=` |
| Register Instrument | Form: category dropdown (seeded list, Part D.3), manufacturer, model, serial number, capacity+unit, accuracy class, location | Submit; show duplicate-warning inline if 409 returned | `POST /instruments` |
| Instrument Detail / History | Instrument fields + full lifecycle timeline (registered → verified → re-verified → certificate) | Start new application from here | `GET /instruments/{id}`, `GET /instruments/{id}/history` |
| My Applications | List with status stepper (Part C.1 enum, shown as a progress bar) | Filter by status; open detail | `GET /applications?applicant_id=` |
| New Application | Select instrument, verification type (initial/re-verification) | Submit as draft, then submit for review | `POST /applications`, `POST /applications/{id}/submit` |
| Application Detail (owner view) | Read-only status, assigned officer (name only), test summary once available | View certificate link when generated | `GET /applications/{id}` |
| Certificate View | Certificate preview, QR code shown, download/print buttons | Download PDF | `GET /certificates/{id}`, `GET /certificates/{id}/pdf` |

### M.3 LMO screens
| Screen | Purpose & key data | Actions | Endpoints |
|---|---|---|---|
| LMO Dashboard | Assigned count, today's activities, pending inspections, completed, flagged results, upcoming | Navigate to assigned list | `GET /dashboard/lmo` |
| Assigned Applications | List filtered to this officer, status stepper visible | Open application to begin work | `GET /applications?assigned_officer_id=` |
| Application Workspace | Instrument info, digital checklist section (test types pulled from applicable rules), status action buttons that change based on current status (Start Inspection → Start Testing → Submit Results) | Trigger the relevant status transition button for current state only | `POST /applications/{id}/start-inspection` / `start-testing` / `submit-results` |
| Test Entry Form | Per test_type: standard value, observed value, remarks, evidence upload | Submit test; show calculated_error + automated_result immediately after save (clearly separate from any final decision) | `POST /applications/{id}/tests`, `POST /applications/{id}/evidence` |
| Decision Screen | Shows all automated_results per test, a distinct "Final Decision" section (Approved/Rejected) with remarks — only rendered if this LMO is the authorized approver for this application (Part C.4) | Submit decision | `POST /applications/{id}/decision` |

### M.4 GATC screens
Same shape as LMO's Assigned Applications, Application Workspace, and Test Entry Form (M.3), but:
- **No Decision Screen** — GATC role never sees an Approve/Reject action; after "Submit Results" the application simply shows "Awaiting LMO/Admin decision."
- Dashboard uses `GET /dashboard/gatc`.

### M.5 Administrator screens
| Screen | Purpose & key data | Actions | Endpoints |
|---|---|---|---|
| Admin Dashboard | Totals, workload by officer, jurisdiction stats, trends | Navigate to management screens | `GET /dashboard/admin` |
| User Approvals | List of `pending_approval` lmo/gatc accounts | Approve / suspend | `GET /admin/users?status=pending_approval`, `POST /admin/users/{id}/approve`, `/suspend` |
| Scheduling & Assignment | List of `under_review` / unassigned applications | Set schedule date, assign officer/GATC, reassign with reason | `POST /applications/{id}/schedule`, `/assign`, `/reassign` |
| Rules Library | Table of rules per category/test_type with version, effective date, limits (or `PENDING_LEGAL_INPUT` badge) | Add new rule version | `GET /rules`, `POST /rules` |
| Instrument Categories | Manage category list and default validity periods | Add/edit category | (extend Part F with category CRUD if needed) |
| Audit Log Viewer | Filterable table: user, action, entity, timestamp, old/new value diff | Filter/search | `GET /audit-logs` |
| Reports & Search | Cross-entity search UI (application/certificate/serial/owner/etc.) | Search, export | `GET /search` |

### M.6 Regulatory / Supervisory screens
| Screen | Purpose & key data | Actions | Endpoints |
|---|---|---|---|
| Regulatory Dashboard | Jurisdiction pendency, expiry trends, enforcement flags (overdue instruments, repeat failures) | Drill into jurisdiction | `GET /dashboard/regulatory` |
| Records Search (read-only, jurisdiction-scoped) | Same fields as Admin search but scoped and read-only | Search, export | `GET /search` (scoped) |
| Audit View (read-only) | Jurisdiction-scoped audit log, no edit actions | View | `GET /audit-logs` (scoped) |

### M.7 Public screen (no login)
| Screen | Purpose & key data | Actions | Endpoints |
|---|---|---|---|
| Certificate Verification Page | QR-scanned landing page: certificate number, instrument type, verification date, validity, authenticated ✅/❌ status. Must NOT show owner personal contact details. | None (read-only) | `GET /public/verify/{qr_token}` |

---

## PART L — NON-GOALS (do not build these — out of scope for this spec)

- Native mobile app (web is mobile-responsive instead)
- Government PKI/DSC signature integration
- Payment gateway integration
- SMS notifications (email + in-app only for this build)
- IoT/direct instrument hardware integration
- True offline-first sync (PWA draft-saving via browser storage is acceptable if attempted, but not required)
