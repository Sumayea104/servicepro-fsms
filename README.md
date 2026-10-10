# ServicePro FSMS - Field Service Management System Backend

ServicePro FSMS is a production-ready, secure and scalable backend for **dispatch-managed field service work**. Customers submit service requests, an admin reviews them and assigns a verified technician with **conflict-free scheduling**, the technician works the job through a tracked status lifecycle, and the customer pays online (Stripe or bKash) and leaves feedback.

---

## 📦 Submission Details

| Item                   | Value                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Backend Repo**       | [servicepro-fsms](https://github.com/Sumayea104/servicepro-fsms)                                               |
| **Live API**           | [https://servicepro-fsms-1.onrender.com](https://servicepro-fsms-1.onrender.com)                               |
| **Health Check**       | [https://servicepro-fsms-1.onrender.com/health](https://servicepro-fsms-1.onrender.com/health)                 |
| **Postman Collection** | [`postman/ServicePro-FSMS.postman_collection.json`](postman/ServicePro-FSMS.postman_collection.json)           |
| **Frontend Repo**      | [servicepro-frontend](https://github.com/Sumayea104/<your-frontend-repo>)                                      |
| **Live Frontend**      | [https://<your-frontend>.vercel.app](https://<your-frontend>.vercel.app)                                       |
| **Admin Email**        | `admin@servicepro.com`                                                                                         |
| **Admin Password**     | `Admin123!`                                                                                                    |
| **Demo Video**         | [Watch Demo Video](<paste-your-video-link-here>)                                                               |
> ⚠️ These credentials are for testing and demonstration only.

### Demo accounts (created by the seed script)

| Role           | Email                           | Password          |
| -------------- | ------------------------------- | ----------------- |
| **Admin**      | `admin@servicepro.com`          | `Admin123!`       |
| **Customer**   | `demo.customer@servicepro.com`  | `Customer123!`    |
| **Technician** | `demo.technician@servicepro.com`| `Technician123!`  |

---

## 🚀 Tech Stack

| Technology         | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| **Runtime**        | Node.js 20+ (ESM)                                              |
| **Framework**      | Express 5 with TypeScript                                      |
| **Database**       | PostgreSQL                                                     |
| **ORM**            | Prisma 7 (driver-adapter pattern via `@prisma/adapter-pg`)     |
| **Auth**           | JWT access + rotating refresh tokens, Google OAuth, bcrypt     |
| **Security**       | Helmet, CORS, express-rate-limit, role-based access control    |
| **Validation**     | Zod                                                            |
| **Payments**       | Stripe (cards) & bKash (sandbox Tokenized Checkout)            |
| **File Uploads**   | Multer (memory) → Cloudinary                                   |
| **Cache**          | Redis (optional: caching + invalidation)                       |
| **Real-time**      | WebSocket (`ws`) live notifications                            |
| **Logging**        | Pino + Morgan                                                  |
| **Deployment**     | Render (REST + WebSocket) / Vercel (REST only)                 |

---

## 🧭 Core Workflow

```
Customer ─► Service Request (PENDING) ─► Admin review ─► Technician assigned + visit scheduled (ASSIGNED)
        ─► Technician accepts (ACCEPTED) ─► Work started (IN_PROGRESS) ─► Work completed (COMPLETED)
        ─► Service report + invoice amount ─► Payment (Stripe / bKash) ─► Customer feedback
```

Every transition is checked against a fixed state map and the role allowed to trigger it, and each one writes a `JobLog` and an `AuditLog` row in the **same database transaction**.

| From          | Allowed next states                | Who can trigger                              |
| ------------- | ---------------------------------- | -------------------------------------------- |
| `PENDING`     | `ASSIGNED`, `CANCELLED`            | Admin (assign / reject), Customer (cancel)   |
| `ASSIGNED`    | `ACCEPTED`, `CANCELLED`            | Assigned technician, Admin, Customer         |
| `ACCEPTED`    | `IN_PROGRESS`, `CANCELLED`         | Assigned technician, Admin, Customer         |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED`           | Assigned technician, Admin (cancel also open to the customer) |
| `COMPLETED`   | - (terminal; payment follows)      | -                                            |
| `CANCELLED`   | - (terminal)                       | -                                            |

---

## 📂 Project Architecture

Layered architecture (routes → controllers → services → Prisma) for a clean separation of concerns:

```
servicepro-fsms/
├── src/
│   ├── config/
│   │   ├── env.ts              # typed environment config
│   │   ├── prisma.ts           # Prisma 7 client + pg driver adapter
│   │   ├── redis.ts            # optional Redis client
│   │   ├── cloudinary.ts
│   │   └── logger.ts           # pino
│   ├── controllers/            # thin HTTP layer
│   │   ├── admin.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── job.controller.ts
│   │   ├── notification.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── review.controller.ts
│   │   ├── technician.controller.ts
│   │   └── user.controller.ts
│   ├── services/               # business logic + transactions
│   │   ├── admin.service.ts
│   │   ├── auth.service.ts
│   │   ├── job.service.ts      # state machine, conflict-safe assignment
│   │   ├── notification.service.ts
│   │   ├── payment.service.ts  # Stripe + bKash, idempotent finalisation
│   │   ├── review.service.ts
│   │   ├── technician.service.ts   # suggestion scoring
│   │   ├── upload.service.ts
│   │   └── user.service.ts
│   ├── routes/                 # one router per resource + index.ts
│   ├── validators/             # Zod schemas per resource
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication
│   │   ├── role.ts             # requireRole(...)
│   │   ├── validate.ts         # Zod validation
│   │   ├── rateLimiter.ts
│   │   ├── upload.ts           # Multer
│   │   └── errorHandler.ts     # 404 + structured errors
│   ├── errors/AppError.ts
│   ├── utils/                  # apiResponse, asyncHandler, jwt, auditLog, cache, stateMachine
│   ├── ws/notifier.ts          # WebSocket connection registry + broadcast
│   ├── types/express.d.ts
│   ├── constants.ts            # transition map, pagination defaults
│   ├── app.ts                  # Express app (middleware + routes)
│   ├── server.ts               # REST only (local dev)
│   ├── ws-server.ts            # REST + WebSocket (Render)
│   └── server.vercel.ts        # serverless entrypoint (Vercel)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                 # admin + demo customer + demo technician
├── postman/ServicePro-FSMS.postman_collection.json
├── prisma.config.ts
├── render.yaml
├── vercel.json
└── package.json
```

---

## 🗄️ Database Design

PostgreSQL with Prisma 7. Main models: `User`, `RefreshToken`, `TechnicianProfile`, `Availability`, `Job`, `JobLog`, `Attachment`, `ServiceReport`, `Payment`, `TechnicianReview`, `Notification`, `AuditLog`, `SystemSetting`.

- **Relationships & constraints:** one-to-one `Job`↔`Payment`/`ServiceReport`/`TechnicianReview` enforced with `@unique`; unique gateway identifiers on `Payment` (`stripePaymentId`, `bkashPaymentId`, `bkashTrxId`, `transactionId`) back webhook idempotency.
- **Indexes** target real query patterns: `Job(status, scheduledAt)`, `Job(technicianId)`, `Job(customerId)`, `AuditLog(entity, entityId)`, `Notification(userId, isRead)`, `RefreshToken(userId, revokedAt)`, and more.
- **Soft delete:** users are deactivated with `deletedAt` + `isActive` instead of being removed.
- **Payment methods:** `STRIPE` and `BKASH` only - there is deliberately no cash or pay-later option.

---

## 🛡️ Security Features Implemented

- **Helmet**: secure HTTP headers
- **CORS**: restricted to the configured `FRONTEND_URL` (credentials supported)
- **Rate limiting**: global limiter plus a stricter limiter on login/register
- **Input validation**: every mutating endpoint validated with Zod, returning field-level errors
- **Password hashing**: bcrypt
- **JWT authentication**: short-lived access token + **rotating refresh tokens** (stored hashed; each refresh revokes the previous token)
- **Google OAuth**: ID token verified server-side
- **Role-based access control**: `CUSTOMER`, `TECHNICIAN`, `ADMIN` enforced per route and re-checked on resource ownership in the service layer
- **Webhook security**: Stripe webhook signature verification on the raw request body
- **Audit trail**: critical actions recorded with actor, action, entity and details
- **Secrets**: environment variables only, never committed

---

## 📚 API Endpoints

**Base URL:** `https://servicepro-fsms-1.onrender.com/api/v1`

All responses use one structure:

```json
{ "success": true,  "message": "Operation successful", "data": {} }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "email", "message": "Invalid email" }] }
```

Protected routes use `Authorization: Bearer <accessToken>`.

### 🔑 Authentication

| Method | Endpoint               | Description                              | Access |
| ------ | ---------------------- | ---------------------------------------- | ------ |
| `POST` | `/auth/register`       | Register as customer or technician       | Public |
| `POST` | `/auth/login`          | Email/password login                     | Public |
| `POST` | `/auth/google`         | Login / sign up with a Google ID token   | Public |
| `POST` | `/auth/refresh-token`  | Rotate refresh token, get a new access token | Public |
| `POST` | `/auth/logout`         | Revoke the refresh token                 | Public |

### 👤 Users

| Method  | Endpoint            | Description                  | Access  |
| ------- | ------------------- | ---------------------------- | ------- |
| `GET`   | `/users/me`         | Current user profile         | Private |
| `PATCH` | `/users/me`         | Update profile               | Private |
| `POST`  | `/users/me/avatar`  | Upload avatar (Cloudinary)   | Private |

### 🛠️ Technicians

| Method  | Endpoint                              | Description                                         | Access     |
| ------- | ------------------------------------- | --------------------------------------------------- | ---------- |
| `GET`   | `/technicians`                        | List technicians (`?skill&available&verified&page&limit`) | Public |
| `GET`   | `/technicians/suggest?jobId=`         | Ranked technician suggestions for a job             | Admin      |
| `GET`   | `/technicians/:id`                    | Technician profile                                  | Public     |
| `GET`   | `/technicians/:id/reviews`            | Technician reviews                                  | Public     |
| `PATCH` | `/technicians/me/availability`        | Toggle accepting jobs                               | Technician |
| `PATCH` | `/technicians/me/location`            | Update current location                             | Technician |
| `PATCH` | `/technicians/me/skills`              | Update skills & service areas                       | Technician |
| `PUT`   | `/technicians/me/weekly-availability` | Replace weekly working hours                        | Technician |

### 📋 Jobs (service requests & work orders)

| Method  | Endpoint                     | Description                                              | Access      |
| ------- | ---------------------------- | -------------------------------------------------------- | ----------- |
| `POST`  | `/jobs`                      | Create a service request                                 | Customer    |
| `GET`   | `/jobs`                      | List jobs (role-scoped; `?status&category&priority&sortBy&sortOrder&page&limit`) | Private |
| `GET`   | `/jobs/search?q=`            | Search title / description / address                     | Admin       |
| `GET`   | `/jobs/:id`                  | Job details with timeline, payment, report, attachments  | Private     |
| `PATCH` | `/jobs/:id/review`           | Approve (record review) or reject a pending request      | Admin       |
| `POST`  | `/jobs/:id/assign`           | Assign technician + schedule visit (conflict-checked)    | Admin       |
| `PATCH` | `/jobs/:id/reschedule`       | Move the visit (conflict-checked)                        | Admin       |
| `PATCH` | `/jobs/:id/status`           | Accept / start / complete / cancel                       | Technician* |
| `POST`  | `/jobs/:id/cancel`           | Cancel a job                                             | Owner / Admin |
| `POST`  | `/jobs/:id/service-report`   | Submit or update the service report                      | Technician  |
| `POST`  | `/jobs/:id/attachments`      | Upload a photo / document                                | Private     |
| `POST`  | `/jobs/:id/review-feedback`  | Rate the technician after completion                     | Customer    |

\* Accept/start/complete are technician-only; cancellation is allowed for the job's customer, assigned technician or an admin.

### 💳 Payments

| Method | Endpoint                    | Description                                          | Access   |
| ------ | --------------------------- | ---------------------------------------------------- | -------- |
| `GET`  | `/payments`                 | Payment history (role-scoped, `?status&page&limit`)  | Private  |
| `POST` | `/payments/initiate`        | Start a Stripe PaymentIntent or bKash payment        | Customer |
| `GET`  | `/payments/:id`             | Payment details / status                             | Private  |
| `GET`  | `/payments/bkash/callback`  | bKash redirect callback (finalises the payment)      | Gateway  |
| `POST` | `/payments/webhook`         | Stripe webhook (signature verified, idempotent)      | Gateway  |

### 🔔 Notifications

| Method  | Endpoint                   | Description              | Access  |
| ------- | -------------------------- | ------------------------ | ------- |
| `GET`   | `/notifications`           | My notifications         | Private |
| `PATCH` | `/notifications/:id/read`  | Mark as read             | Private |

Live push is available over WebSocket at `/ws?token=<accessToken>` on the Render deployment.

### 👑 Admin

| Method   | Endpoint                          | Description                              |
| -------- | --------------------------------- | ---------------------------------------- |
| `GET`    | `/admin/users`                    | List users (`?role&page&limit`)          |
| `PATCH`  | `/admin/users/:id/role`           | Change a user's role                     |
| `DELETE` | `/admin/users/:id`                | Deactivate (soft delete) a user          |
| `GET`    | `/admin/technicians/pending`      | Technicians awaiting verification        |
| `PATCH`  | `/admin/technicians/:id/verify`   | Approve or reject a technician           |
| `GET`    | `/admin/dashboard-stats`          | Platform statistics (Redis-cached)       |
| `GET`    | `/admin/audit-logs`               | Audit trail (`?entity&page&limit`)       |
| `PUT`    | `/admin/settings`                 | Create / update a system setting         |

Plus `GET /health` for uptime checks. **43 documented endpoints** in total.

---

## ⚙️ Getting Started

### Prerequisites
Node.js 20+, PostgreSQL (e.g. Neon), and optionally Redis.

### Installation

```bash
git clone https://github.com/Sumayea104/servicepro-fsms.git
cd servicepro-fsms
npm install                      # runs `prisma generate` automatically
cp .env.example .env             # then fill in the values below
npx prisma migrate dev --name init
npx prisma db seed               # admin + demo customer + demo technician
npm run dev                      # REST API on http://localhost:5000
# npm run dev:ws                 # REST API + WebSocket
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets |
| `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` | Token lifetimes (default `15m` / `7d`) |
| `FRONTEND_URL` | Allowed CORS origin + bKash redirect target |
| `GOOGLE_CLIENT_ID` | Google sign-in |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe payments (test mode) |
| `BKASH_BASE_URL`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_CALLBACK_URL` | bKash sandbox |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | File uploads |
| `REDIS_URL` | Optional caching |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seeded admin credentials |

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` / `dev:ws` | Development (REST / REST + WebSocket) |
| `npm run build` | Generate the Prisma client and compile TypeScript |
| `npm start` / `start:ws` | Run the compiled server |
| `npx prisma migrate deploy` | Apply migrations in production |
| `npx prisma db seed` | Seed demo data |

---

## 🌐 Deployment

- **Render (Primary):** `render.yaml` runs `prisma generate && prisma migrate deploy && npm run build` and starts `npm run start:ws`. This runs both the REST API and WebSocket (`ws`) live notifications in a single long-lived process.
- **Vercel (Frontend & Serverless REST):** Optimized for client-side frontend hosting. Note that WebSocket connections require the Render primary host for real-time features.
- **Webhook Configuration:**
  - **Stripe:** Register `https://servicepro-fsms-1.onrender.com/api/v1/payments/webhook` in the Stripe Dashboard.
  - **bKash:** Set `BKASH_CALLBACK_URL` in environment variables to `https://servicepro-fsms-1.onrender.com/api/v1/payments/bkash/callback`.
---

## 💡 Challenges & Key Learnings

### 🚀 Technical Challenges & Solutions

1. **Preventing double-booked technicians:**
   - **Challenge:** Two dispatchers assigning the same technician to overlapping slots at the same moment can both pass a simple "is there a conflict?" check.
   - **Solution:** Assignment and rescheduling run inside a transaction that first takes a Postgres advisory lock (`pg_advisory_xact_lock`) scoped to the technician, then checks for overlapping active jobs before committing, so concurrent attempts are serialised and the loser gets a clean `409 Conflict`.

2. **Idempotent, signature-verified payments:**
   - **Challenge:** Gateways retry webhooks, and Stripe's signature check fails if the body is JSON-parsed first.
   - **Solution:** The webhook route is mounted with `express.raw()` *before* the global JSON parser. Payment finalisation checks the current status and uses unique gateway ids, so a replayed event is a no-op rather than a double credit. Retry attempts are tracked on the `Payment` row.

3. **Dual payment gateways (Stripe & bKash):**
   - **Challenge:** Card payments (PaymentIntent, webhook-driven) and bKash (redirect + token grant → create → execute) have completely different flows and currencies.
   - **Solution:** One payment service with a shared `finalizePayment` transaction that updates the payment, writes the audit log and notifies the user, regardless of gateway; the currency is recorded per payment.

4. **Role-based security without repeated checks:**
   - **Challenge:** Three roles with different views of the same resources (a customer must only see their own jobs, a technician only assigned ones).
   - **Solution:** `authenticate` + `requireRole(...)` middleware guard routes, and the service layer scopes queries and re-checks ownership, so data access is safe even if a route is misconfigured.

5. **Prisma 7 driver adapter & ESM:**
   - **Challenge:** Prisma 7 moves connection handling to a driver adapter and generates an ESM client into the source tree; NodeNext ESM also requires explicit `.js` import extensions.
   - **Solution:** Configured `@prisma/adapter-pg` in `config/prisma.ts`, generated the client on `postinstall`/build, and added a `vercel-build` script so serverless deployments generate it before compiling.

6. **Cross-origin refresh tokens:**
   - **Challenge:** An httpOnly refresh cookie on the API domain is not sent from a frontend on another domain.
   - **Solution:** Refresh tokens are also returned in the response body and accepted from the request body; they are stored hashed server-side and rotated on every use.

### 📚 Key Learnings

- **Concurrency control in SQL:** advisory locks inside transactions are a simple, reliable way to serialise a critical section per resource.
- **Payment engineering:** treat gateway callbacks as untrusted and repeatable - verify, then apply changes idempotently.
- **Designing around a state machine:** one transition map plus per-role permissions keeps workflow rules in one place and makes audit logging automatic.
- **Deployment trade-offs:** persistent connections (WebSocket) need a long-running host, while serverless suits stateless REST.

---

## 📚 API Documentation

- **Postman Collection:** [`postman/ServicePro-FSMS.postman_collection.json`](postman/ServicePro-FSMS.postman_collection.json) - Import it into Postman, run **Auth → Login (Admin)** and **Login (Customer)** first; access tokens will be saved to collection variables automatically.

---

## 🧪 Testing

### Test the API with cURL

```bash
# Health check
curl [https://servicepro-fsms-1.onrender.com/health](https://servicepro-fsms-1.onrender.com/health)

# Login as the demo admin
curl -X POST https://servicepro-fsms-1.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@servicepro.com","password":"Admin123!"}'

# Use the returned accessToken
curl https://servicepro-fsms-1.onrender.com/api/v1/admin/dashboard-stats \
  -H "Authorization: Bearer <accessToken>"
```

### Suggested walkthrough (matches the demo video)

1. Log in as **Customer** → `POST /jobs` to create a request.
2. Log in as **Admin** → `GET /technicians/suggest?jobId=…`, then `POST /jobs/:id/assign` with a time slot (try the same slot twice to see the `409`).
3. Log in as **Technician** → `PATCH /jobs/:id/status` (`ACCEPTED` → `IN_PROGRESS` → `COMPLETED` with `finalCost`) and `POST /jobs/:id/service-report`.
4. As **Customer** → `POST /payments/initiate` (Stripe or bKash), then `POST /jobs/:id/review-feedback`.
5. As **Admin** → `GET /admin/audit-logs` and `GET /admin/dashboard-stats`.

---

## 👨‍💻 Developer

- **Sumayea Rahman**
- **GitHub:** [Sumayea104](https://github.com/Sumayea104)
- **Email:** <sumayearahman7@gmail.com>

---

## 📞 Support

For any questions or issues, please [open an issue](https://github.com/Sumayea104/servicepro-fsms/issues) or contact the developer.

---

## ⭐ Show Your Support

If you found this project helpful, please give it a ⭐ on GitHub!
