# Project Context: Legal Metrology E-Certificate Platform

## Overview
This platform digitizes the lifecycle of weighing/measuring instrument verification under India's Legal Metrology Act, 2009.
It provides a completely automated workflow from instrument registration by business owners, to inspection by Legal Metrology Officers (LMO), automated error calculations, escalation to Government Approved Test Centers (GATC), and finally digital E-Certificate generation with public QR code verification.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4.
- **Backend**: FastAPI (Python 3.11+) + SQLAlchemy (asyncpg).
- **Database**: Supabase (PostgreSQL with PgBouncer connection pooling).
- **Authentication**: Supabase Auth (JWT decoding on backend).
- **PDF Generation**: `reportlab` + `qrcode` library.

## Design & UI Constraints
- **Theme**: Strictly "light theme only". Trendy and premium. Deep Teal (`#004d40`), Off-Whites (`#fdf9f4`), and Crimson (`#b71c1c`) for highlights. NO purple or blue colors.
- **Responsiveness**: Fully supported for mobile, tablet, and PC web browsers.

## Key Architectures & Gotchas (DO NOT IGNORE)
1. **Supabase Connection Pooling**: The database URL uses `pooler.supabase.com`. To prevent `DuplicatePreparedStatementError`, SQLAlchemy engines MUST be created with `connect_args={"statement_cache_size": 0}`.
2. **Supabase Auth Sync**: Frontend signups go to `auth.users` (Supabase schema). The backend relies on `public.users` for foreign keys. A `sync_auth_users` function runs via FastAPI `lifespan` in `app/main.py` on every server boot to copy new users from `auth.users` to `public.users`.
3. **JWT Decoding**: `SUPABASE_JWT_SECRET` can be base64 encoded. The `_decode_token` in `security.py` gracefully handles raw, base64 padded, and unverified decoding to ensure it never crashes.
4. **Enum Assignment Crash**: When updating SQLAlchemy Enum columns (like `UserRole` or `ApplicationStatus`), always assign the Enum object itself (e.g., `UserRole.lmo`), NEVER the `.value` string, otherwise SQLAlchemy crashes during `flush()`.
5. **ReportLab PDF**: The certificate generator uses `reportlab` and `qrcode` to generate physical PDFs stored in `static/certificates/`.

## User Roles
1. **owner**: Business owners registering instruments and applying for verification.
2. **lmo**: Legal Metrology Officers who test the instruments and input actual readings.
3. **gatc**: Govt Approved Test Centers that review flagged applications and issue final certificates.
4. **admin**: Super Admins who oversee system metrics and view the global audit log.

## Current State (End of Phase 5)
- **Phase 1 (Foundation)**: Complete (DB Migrations, Tailwind v4).
- **Phase 2 (Instruments & Applications)**: Complete (Owner Dashboards, CRUD APIs).
- **Phase 3 (LMO & Decision Engine)**: Complete (LMO Dashboards, Math-based PASS/FAIL rules engine).
- **Phase 4 (GATC & Certificates)**: Complete (GATC Dashboard, PDF Generation, Public QR Verification Portal).
- **Phase 5 (Super Admin)**: Complete (System Metrics API, Audit Log Viewer, Light Theme Admin Dashboard).

## Where We Left Off
All core workflows (Phases 1 through 5) are 100% complete and functionally wired. 
The user can log in as `owner` -> submit app -> log in as `lmo` -> fail a test -> log in as `gatc` -> approve & generate cert -> go to `/verify` to check the QR token.

**Next Steps (Phase 6 - Hardening)**:
- Rate limiting for APIs.
- Comprehensive seed data script.
- Email/In-app notification system (if desired).
- Deploying frontend to Vercel and backend to a hosting provider.
