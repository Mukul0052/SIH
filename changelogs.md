# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Phase 5 - Super Admin & System Metrics
- Built backend `GET /api/v1/admin/metrics` to aggregate total users, instruments, and applications by pipeline status.
- Built backend `GET /api/v1/admin/audit-logs` to expose chronologically ordered system actions.
- Created `AdminDashboard.tsx` UI featuring a strictly "light theme" design (Off-white/Teal) to differentiate the Super Admin view.
- Added dynamic tabs for "System Metrics" (KPI cards) and "Audit Logs" (Data table) in the Admin Dashboard.
- Wired Admin Role routing into `App.tsx`.

### Phase 4 - E-Certificate Generation & Document Verification (GATC)
- Built `GATCDashboard.tsx` to list all applications in `under_review`, `approved`, and `certificate_generated` statuses.
- Built `GATCReview.tsx` for Govt Approved Test Centers to view failed LMO tests and manually "Override & Approve" or "Reject".
- Implemented `/api/v1/certificates/generate` using `reportlab` and `qrcode` to generate Government of India branded PDF certificates with embedded QR codes.
- Added `CertificateVerification.tsx` public portal (`/verify`) allowing anyone to input the 16-character QR token to fetch real-time validity from the database.

### Phase 3 - Inspection, Testing & Automated Decision Engine (LMO)
- Built LMO Dashboard UI (`LMODashboard.tsx`) showing assigned applications and queue.
- Built LMO Inspection Suite (`LMOInspection.tsx`) for recording tests (expected vs actual with tolerance).
- Created Automated Decision Engine API (`/api/v1/applications/{id}/finalize-tests`) that evaluates `error = abs(expected - actual) <= tolerance` and assigns PASS/FAIL statuses automatically.
- Added MVP auto-assignment to route new applications directly to an LMO.
- Fixed severe database constraint bugs related to `inspector_remarks` and `assigned_officer_role` SQLAlchemy Enum assignments.

### Phase 2 - Instruments & Applications
- Built FastAPI Supabase JWT auth middleware (`core/security.py`) with RBAC support.
- Implemented startup script `sync_auth_users` to mirror Supabase `auth.users` into `public.users` to fix Foreign Key errors.
- Created Instruments CRUD API (`/api/v1/instruments/`) and Applications API (`/api/v1/applications/`).
- Added robust backend schema validation via Pydantic and SQLAlchemy.
- Built frontend components: Register Instrument form, My Instruments list, New Application form, My Applications list, and Owner Dashboard.

### Phase 1 - Foundation
- Initialized FastAPI backend structure.
- Initialized Vite React TS frontend structure with Tailwind v4.
- Generated base UI screens adhering strictly to the "no blue/purple, light premium trendy" constraints.
- Set up Supabase PostgreSQL DB with Alembic migrations.
- Configured connection pooling parameters (`statement_cache_size: 0`) for Asyncpg.
