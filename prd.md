# PRD: TMDB Reviews with ML Sentiment Classification

## 1. Overview

This project extends the existing Nuxt Movies application with authentication, role-based access, persistent reviews, admin approval, moderation, and integration with the local sentiment analysis API in `/home/ifcon/ff/ML/model_reviews_api`.

The core user experience: an approved signed-in user opens a movie or TV detail page, writes one review, submits it, and receives immediate sentiment feedback from the ML model (`positive` or `negative`) through a polished cinematic animation. The review and classification result are stored in a database and shown on the media detail page for other users to read.

Implementation must be done phase-by-phase. Do not start the next phase until the current phase passes the relevant verification commands and the project owner explicitly asks to continue, unless the project owner asks the agent to implement multiple phases in one pass.

## 2. Goals

- Add registration, login, logout, and profile pages.
- Support two roles: `admin` and `user`.
- Require admin approval before newly registered users can submit reviews.
- Add a database for users, sessions, reviews, user approval status, and ML classification results.
- Add one editable review per user per movie/TV item.
- Integrate the existing FastAPI sentiment model service.
- Store the original review, model label, confidence, and score details.
- Show creative positive/negative feedback animation after classification.
- Add admin pages for user approval and review moderation.
- Keep TMDB as the source of truth for movie/TV metadata.

## 3. Non-Goals

- Do not train or modify the ML model in this repo.
- Do not replace TMDB data with local movie/TV data.
- Do not build a full TMDB clone admin CMS.
- Do not allow anonymous review submission.
- Do not expose the ML API key to the browser.
- Do not expose raw confidence or score details to normal users.
- Do not build role-management UI in V1; admin accounts can be seeded or created manually.

## 4. Users and Roles

### Guest

- Can browse movies, TV shows, people, photos, videos, and search.
- Can view public reviews and moderation placeholders.
- Cannot submit reviews.
- Can register and log in.

### Pending User

- Has registered but has not been approved by an admin.
- Cannot create an active login session until approved.
- Cannot submit reviews.
- During login, is redirected to `/login?status=pending` and sees: `Your account is waiting for admin approval.`
- Because pending users are not session-authenticated, movie/TV detail pages treat them as guests. Pending status messages are shown only on the login page after registration or a pending-account login attempt.

### Approved User

- Can submit reviews for movies and TV shows.
- Can have only one review per media item.
- Can edit their own existing review for the same media item.
- Can soft-delete their own review.
- Can view their own review history in profile.
- Receives sentiment feedback after submission/edit.
- Cannot see model confidence or raw score details.

### Admin

- Can access admin pages.
- Can approve/reject newly registered users.
- Can view all users and all reviews.
- Can hide or delete inappropriate reviews.
- Can inspect sentiment label, confidence, and score details.
- Does not need role-management UI in V1.

## 5. Existing System Context

### Frontend App

- Nuxt 3 / Vue 3 app in `/home/ifcon/ff/ML/movies-vue`.
- TMDB data is fetched through the local proxy via `BASE_URL=http://localhost:3001`.
- The Nuxt app runs locally on port `3000`; only port `3000` is planned to be exposed publicly through Cloudflare Zero Trust.
- Detail route for both media types: `pages/[type]/[id].vue`.
- Detail shell: `components/media/Details.vue`.
- Overview content: `components/media/Overview.vue`.

### TMDB Proxy

- Local proxy workspace in `proxy/`.
- TMDB API route: `proxy/routes/tmdb/[...path].ts`.
- Image proxy route: `proxy/routes/ipx/[...path].ts`.

### ML Model API

- FastAPI service in `/home/ifcon/ff/ML/model_reviews_api`.
- Default URL: `http://127.0.0.1:8000`.
- Requires header: `x-api-key: <API_KEY>`.
- Recommended endpoint: `POST /predict`.

Request:

```json
{
  "text": "This movie was surprisingly heartfelt, funny, and beautifully acted."
}
```

Response:

```json
{
  "label": "positive",
  "confidence": 0.9432,
  "scores": {
    "negative": 0.0568,
    "positive": 0.9432
  },
  "is_positive": true
}
```

## 6. Recommended Architecture

### Database

Use PostgreSQL with Prisma.

The project owner already provides these database values in `.env`:

```text
DB_HOST=localhost
DB_PORT=5432
DB_USER=fanfan
DB_PASSWORD=<configured in .env>
DB_NAME=db_movie-vue
```

Implementation may either build `DATABASE_URL` from the `DB_*` variables for Prisma, or add a derived `DATABASE_URL` value to `.env`. Do not hard-code database credentials in source files.

Required dependencies:

```text
Runtime dependencies:
- @prisma/client
- argon2
- zod

Dev dependencies:
- prisma
```

Do not add a full authentication framework in V1. Implement the cookie + database-backed Session flow described in this PRD.

### Auth

Use server-side authentication with secure HTTP-only cookies. Do not store auth tokens in `localStorage`.

Minimum requirements:

- Password hashing with `argon2id`.
- HTTP-only session cookie.
- Session cookie name: `movies_session`.
- Session cookie flags: `HttpOnly`, `SameSite=Lax`, `Secure` in production, and an explicit expiration.
- Server-side role checks for admin endpoints.
- Server-side approval checks for review creation/editing.
- For V1 CSRF protection, mutating server API routes must validate the request `Origin` header against `APP_ORIGIN`.
- Use simple in-memory rate limiting for login, registration, and review submission in local V1. Do not introduce Redis or external rate-limit services unless explicitly requested later.

Session implementation details:

- Generate raw session tokens with Node `crypto.randomBytes(32).toString('base64url')`.
- Store the raw session token only in the `movies_session` HTTP-only cookie.
- Store `sha256(rawSessionToken)` in `Session.tokenHash`.
- Session lifetime: 30 days.
- Cookie path: `/`.
- Expired sessions should be deleted when encountered by `GET /api/auth/me` or other auth helpers.
- Logout deletes the database session and clears the cookie.
- The admin seed script must create an approved admin user with `role = admin` and `approvalStatus = approved`.

Rate limit defaults for local V1:

- Login: maximum 5 attempts per 10 minutes per IP plus username/email identifier.
- Registration: maximum 3 attempts per hour per IP.
- Review create/edit: maximum 10 attempts per 10 minutes per authenticated user.
- Return a clear 429 response when a rate limit is exceeded.

### ML Integration

The browser must never call `model_api` directly with the API key.

Implement Nuxt server routes that call the model service server-side:

```text
POST /api/reviews
  -> validate session
  -> validate user approval
  -> validate review text
  -> call model_api /predict with MODEL_API_KEY
  -> create or update review
  -> store classification
  -> return saved review + user-safe classification result
```

Recommended environment variables:

```text
APP_ORIGIN=http://localhost:3000
BASE_URL=http://localhost:3001
MODEL_API_BASE_URL=http://127.0.0.1:8000
MODEL_API_KEY=<same API_KEY from model_api/.env>
SESSION_SECRET=<long random secret>
DB_HOST=localhost
DB_PORT=5432
DB_USER=fanfan
DB_PASSWORD=<configured in .env>
DB_NAME=db_movie-vue
DATABASE_URL=postgresql://fanfan:<password>@localhost:5432/db_movie-vue
```

`BASE_URL` is the TMDB proxy base URL, not the Nuxt app URL. Update `.env.example` with the variable names above, but do not include real secrets.

Recommended Nuxt runtime config shape:

```ts
runtimeConfig: {
  appOrigin: process.env.APP_ORIGIN,
  modelApiBaseUrl: process.env.MODEL_API_BASE_URL,
  modelApiKey: process.env.MODEL_API_KEY,
  sessionSecret: process.env.SESSION_SECRET,
  public: {
    apiBaseUrl,
  },
}
```

Only `runtimeConfig.public.apiBaseUrl` may be exposed to the browser. `MODEL_API_BASE_URL`, `MODEL_API_KEY`, `SESSION_SECRET`, `APP_ORIGIN`, and database credentials must remain server-only.

Local runtime topology:

- Main Nuxt app: `http://localhost:3000`.
- TMDB proxy: `http://localhost:3001`.
- ML sentiment API: `http://127.0.0.1:8000`.
- Public exposure plan: expose only the Nuxt app on port `3000` through Cloudflare Zero Trust. Keep the TMDB proxy, PostgreSQL, and ML API private/local.

## 7. Data Model

Use Prisma with string IDs. Unless stated otherwise, use Prisma `String @id @default(cuid())` for primary keys and timestamps with `DateTime @default(now())` / `@updatedAt`.

Prisma schema must use named relations for User approval and review moderation self-relations. The schema must pass `pnpm prisma validate` before implementation continues.

Required Prisma enums:

```prisma
enum UserRole {
  admin
  user
}

enum ApprovalStatus {
  pending
  approved
  rejected
}

enum ReviewStatus {
  visible
  hidden_by_admin
  deleted_by_admin
  deleted_by_user
}
```

Recommended self-relation names:

- User approval relation from approver admin to approved/rejected users: `UserApprover` / `ApprovedUsers`.
- Review moderation relation from moderator admin to moderated reviews: `ReviewModerator` / `ModeratedReviews`.

### User

- `id`: string primary key, Prisma `cuid()`
- `username`: unique string, used as the public reviewer name
- `email`: unique string
- `passwordHash`: string
- `role`: enum `admin` or `user`
- `approvalStatus`: enum `pending`, `approved`, `rejected`
- `approvedAt`: datetime, nullable
- `approvedById`: foreign key to User, nullable
- `createdAt`: datetime
- `updatedAt`: datetime

Default registration behavior:

- New registrations create `role = user`.
- New registrations create `approvalStatus = pending`.

### Session

- `id`: string primary key
- `userId`: foreign key to User
- `tokenHash`: unique SHA-256 hash of the raw session token
- `expiresAt`: datetime
- `createdAt`: datetime
- Store only an opaque random session token in the cookie. Store only the SHA-256 hash of that token in the database.
- Never store role, approval status, email, or other user data in the cookie.

### Review

- `id`: string primary key, Prisma `cuid()`
- `userId`: foreign key to User
- `tmdbMediaType`: enum/string `movie` or `tv`
- `tmdbMediaId`: string
- `tmdbTitleSnapshot`: string
- `tmdbPosterPathSnapshot`: string, nullable
- `content`: text
- `sentimentLabel`: string, `positive` or `negative`
- `sentimentConfidence`: float
- `sentimentScoresJson`: JSON
- `modelVersion`: string, nullable
- `status`: enum `visible`, `hidden_by_admin`, `deleted_by_admin`, `deleted_by_user`
- `moderationMessage`: string, nullable
- `moderatedAt`: datetime, nullable
- `moderatedById`: foreign key to User, nullable
- `createdAt`: datetime
- `updatedAt`: datetime

Required constraints:

- Enforce unique `(userId, tmdbMediaType, tmdbMediaId)`.
- If a user submits again for the same movie/TV item, treat it as an edit and re-run classification.
- All delete actions are soft deletes in V1 so user and admin deletion history remains auditable.
- If a user submits again after their own review is `deleted_by_user`, reuse the existing review row, set `status = visible`, replace the content, and re-run classification.
- `visible`: shown publicly with original content.
- `hidden_by_admin`: shown publicly as a moderation placeholder.
- `deleted_by_admin`: shown publicly as a moderation placeholder.
- `deleted_by_user`: not shown publicly and does not show a public placeholder.
- V1 does not need UI support for restoring admin-hidden or admin-deleted reviews to `visible`.

## 8. Pages

Required public/user pages:

```text
/login
/register
/profile
```

Required admin pages:

```text
/admin
/admin/approvals
/admin/reviews
/admin/users
```

Existing media detail pages remain:

```text
/movie/:id
/tv/:id
```

## 9. Feature Requirements

### 9.1 Registration

Fields:

- Username
- Email
- Password
- Confirm password

Validation:

- Username must be unique.
- Email must be unique.
- Password minimum 8 characters.
- Display useful validation messages.

Success:

- Create user with `role = user`.
- Create user with `approvalStatus = pending`.
- Do not create a login session after registration.
- Redirect to `/login?status=pending`.
- Copy: `Registration received. Your account is waiting for admin approval before you can write reviews.`

### 9.2 Login

Fields:

- Username or email
- Password

Success:

- If approved: create session, then redirect to previous page or home.
- If pending: do not create an active session; redirect to `/login?status=pending` and show alert `Your account is waiting for admin approval.`
- If rejected: do not create an active session; redirect to `/login?status=rejected` and show alert `Your account was rejected by an administrator.`

Failure:

- If no matching username/email exists, show: `No account was found for that username or email.`
- If the account exists but the password is wrong, show: `Username/email or password is incorrect.`

### 9.3 Logout

- Destroy session.
- Redirect to home.

### 9.4 Profile

Route:

```text
/profile
```

Requirements:

- Show username, email, role, approval status, and account creation date.
- Show the user's submitted reviews.
- Pending and rejected users normally cannot access profile because they cannot create an active session.
- Approved users can jump back to reviewed movies/TV shows.
- Approved users can edit or soft-delete their own reviews from profile.
- Admin users can access admin dashboard.

### 9.5 Navigation

Update navigation to show:

- Guest: Login, Register
- Approved user: Profile, Logout
- Admin: Admin dashboard, Profile, Logout
- Pending/rejected users are not session-authenticated, so they stay on Login/Register navigation and see status alerts on `/login`.

Keep current left navigation visually consistent with the dark cinematic layout.

### 9.6 Movie and TV Review Form

Location:

- Movie and TV detail pages.
- Prefer the Overview tab under the Storyline/Info area or below cast, depending on layout fit.

Requirements:

- Guests see: `Log in to write a review.`
- Approved users can submit.
- Textarea minimum: 10 characters.
- Textarea maximum: 2000 characters.
- Submit button shows loading state while classification is running.
- Prevent duplicate rapid submissions.
- A user can only have one review per media item.
- If a review already exists, show edit mode with the existing review prefilled.
- Editing a review must re-run sentiment classification and update stored results.
- Deleting a user's own review must soft-delete it and remove it from public review lists.
- On success, update the review list without full page reload.
- On model/API failure, show a recoverable error and do not store an unclassified review.

### 9.7 ML Sentiment Feedback

After submission/edit, show immediate feedback based on `label`.

Positive feedback:

- Warm cinematic glow washes over the review panel.
- Small star particles or rating sparkles radiate from the submit area.
- User-facing copy: `Thanks for sharing a bright take. Your review adds a helpful positive signal for this title.`

Negative feedback:

- Cool moody ripple or desaturated pulse moves through the panel.
- Subtle critic-stamp or soft scanline effect.
- User-facing copy: `Thanks for the honest critique. Your review helps others understand a different side of this title.`

Rules:

- Do not show confidence percentage to normal users.
- Admin can see label, confidence, and raw scores in moderation screens.
- Animation should last around 900-1400ms.
- Respect `prefers-reduced-motion`.
- Do not block browsing.
- Keep the tone cinematic, polished, and not childish.

### 9.8 Review List

On movie and TV detail pages, show reviews for the current media item.

Each visible review should display:

- Reviewer username
- Review text
- Sentiment label
- Created date

Do not display raw confidence or score details to normal users.

Moderated reviews:

- `hidden_by_admin` and `deleted_by_admin` reviews should keep a public placeholder so other users know moderation happened.
- Do not show original content once hidden by admin or deleted by admin.
- Keep reviewer username and date visible unless privacy requirements change.
- Hidden placeholder: `This review has been hidden by an administrator.`
- Deleted placeholder: `This review was removed by an administrator.`

User-deleted reviews:

- `deleted_by_user` reviews are soft-deleted for auditability.
- `deleted_by_user` reviews must not appear in public review lists and should not show public placeholders.

Optional:

- Filter by all/positive/negative.
- Sort newest first.
- Show current user's review first.

### 9.9 Admin Dashboard

Route:

```text
/admin
```

Access:

- Admin only.

Dashboard requirements:

- Summary counts:
  - Pending users
  - Approved users
  - Visible reviews
  - Hidden/deleted reviews
  - Positive/negative distribution
- Links to approval queue, review moderation, and user list.

### 9.10 Admin Approval Queue

Route:

```text
/admin/approvals
```

Requirements:

- Show pending users with username, email, registration date.
- Admin can approve or reject.
- Approved users can submit reviews.
- Rejected users cannot submit reviews.

### 9.11 Admin Review Moderation

Route:

```text
/admin/reviews
```

Requirements:

- Table of reviews with media title, type, user, sentiment, confidence, status, created date.
- Admin can hide a review.
- Admin can soft-delete a review.
- Hidden reviews show placeholder publicly.
- Deleted reviews show placeholder publicly.
- Admin can inspect raw model scores.
- Include search/filter by title, user email, status, and sentiment if practical.

### 9.12 Admin Users

Route:

```text
/admin/users
```

Requirements:

- Show user list with username, email, role, approval status, created date.
- No role management required in V1.

## 10. API Requirements

Recommended Nuxt server endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

GET  /api/reviews?type=movie&tmdbId=83533
POST /api/reviews
PATCH /api/reviews/:id
DELETE /api/reviews/:id
GET  /api/user/reviews

GET  /api/admin/approvals
POST /api/admin/approvals/:userId/approve
POST /api/admin/approvals/:userId/reject
GET  /api/admin/reviews
PATCH /api/admin/reviews/:id/status
GET  /api/admin/users
```

Recommended Nuxt/Nitro file layout:

```text
server/api/auth/register.post.ts
server/api/auth/login.post.ts
server/api/auth/logout.post.ts
server/api/auth/me.get.ts

server/api/reviews/index.get.ts
server/api/reviews/index.post.ts
server/api/reviews/[id].patch.ts
server/api/reviews/[id].delete.ts
server/api/user/reviews.get.ts

server/api/admin/index.get.ts
server/api/admin/approvals/index.get.ts
server/api/admin/approvals/[userId]/approve.post.ts
server/api/admin/approvals/[userId]/reject.post.ts
server/api/admin/reviews/index.get.ts
server/api/admin/reviews/[id]/status.patch.ts
server/api/admin/users.get.ts
```

Recommended server utility layout:

```text
server/utils/prisma.ts
server/utils/auth.ts
server/utils/session.ts
server/utils/password.ts
server/utils/reviews.ts
server/utils/model-api.ts
server/utils/tmdb.ts
```

Review submission request:

```json
{
  "tmdbMediaType": "movie",
  "tmdbMediaId": "83533",
  "content": "The visuals were beautiful and the story felt emotionally satisfying."
}
```

The browser must not be trusted as the source of truth for media metadata. On review create/update, the server should validate `tmdbMediaType` and `tmdbMediaId`, fetch the current TMDB detail through the configured TMDB proxy, and store `tmdbTitleSnapshot` and `tmdbPosterPathSnapshot` from the server-fetched response.

User-facing review response:

```json
{
  "review": {
    "id": "review_id",
    "content": "The visuals were beautiful and the story felt emotionally satisfying.",
    "sentimentLabel": "positive",
    "createdAt": "2026-04-25T08:00:00.000Z"
  },
  "classification": {
    "label": "positive",
    "is_positive": true
  }
}
```

Admin endpoints can return:

- `sentimentConfidence`
- `sentimentScoresJson`
- `modelVersion`

## 11. UX and Visual Direction

The existing app is dark, cinematic, poster-forward, and minimal. The review/auth/admin features should feel like they belong in this world, not like generic SaaS screens.

Design direction:

- Keep the dark cinematic theme.
- Use restrained surfaces, subtle borders, and poster/media imagery where helpful.
- Review form should be integrated into media detail flow.
- Admin screens should feel operational, dense, and scannable.
- Feedback animation can be expressive but must stay refined.
- Avoid large marketing-style sections or overly playful UI.

Recommended detail-page layout:

- Keep media hero and tabs unchanged.
- Add a review module to Overview:
  - Input/edit area for approved users
  - Waiting/login prompt for pending/guest users
  - Sentiment feedback after submit
  - Review list below
- On mobile, stack vertically.

Recommended admin layout:

- Left/current navigation remains consistent.
- Use full-width tables or compact list rows.
- Avoid nested cards.
- Use motion only for state changes, approval success, and review moderation confirmation.

## 12. Error, Loading, and Empty States

### Review Loading

- Submit button changes to `Analyzing...`.
- Disable textarea and button during classification.
- Show subtle scanner/progress animation in the review panel.

### Empty Reviews

```text
No reviews yet. Be the first to write one.
```

Guest:

```text
Log in to write the first review.
```

### ML API Down

```text
Review could not be analyzed right now. Please try again.
```

Server behavior:

- Return a clear error.
- Do not expose internal API key or stack trace.
- Do not store unclassified reviews.
- Use a 10 second timeout when calling the ML API.
- Do not retry by default in V1.
- Treat missing or invalid ML API responses as failures.
- Accept only `positive` or `negative` as valid sentiment labels.
- `modelVersion` remains nullable; only store it if the ML API response provides a version field.

### Low Confidence

If confidence is below an implementation-defined threshold, for example `< 0.6`, still store the label and confidence. Low-confidence warnings are admin-only.

Admin copy:

```text
The model is unsure about this review.
```

## 13. Security Requirements

- Never expose `MODEL_API_KEY` to client-side code.
- Hash passwords with `argon2id`; never store plaintext passwords.
- Use HTTP-only session cookies with `Secure`, `SameSite=Lax` or stricter, and appropriate expiration.
- Store only a SHA-256 hash of the session token in the database; never store the raw session token outside the HTTP-only cookie.
- Rotate or invalidate sessions on logout.
- Validate all server API inputs.
- Validate role, approval status, media type, sentiment label, and review status against explicit allowlists/enums.
- Apply simple in-memory rate limiting or throttling to login, registration, and review submission endpoints in V1.
- Mutating server API routes must validate `Origin` against `APP_ORIGIN`.
- Enforce role checks server-side.
- Enforce `approvalStatus = approved` before review create/edit.
- Enforce `approvalStatus = approved` before user review deletion.
- Users can only modify their own reviews.
- Users can soft-delete their own reviews.
- Admin-only endpoints must reject non-admin users.
- Deleted reviews should be soft-deleted for auditability.
- Record `moderatedAt` and `moderatedById` for admin hide/delete actions.
- Do not trust client-provided `userId`, `role`, `approvalStatus`, `sentimentLabel`, `sentimentConfidence`, or `sentimentScoresJson`.
- Use server-side TMDB/media identifiers and validated request payloads; do not persist arbitrary client metadata without validation.
- Avoid storing sensitive raw logs.

## 14. Accessibility Requirements

- Review form must have labels.
- Sentiment feedback must be announced with an accessible live region.
- Approval/rejection/moderation actions must be keyboard accessible.
- Color cannot be the only indicator of positive/negative.
- Animations must respect `prefers-reduced-motion`.
- Admin tables need clear headings and focus states.

## 15. Testing Requirements

Unit tests:

- Auth validation.
- Approval guard.
- Review validation.
- One-review-per-media constraint.
- Sentiment API client success and failure.
- Role authorization helpers.
- Unit tests must mock Prisma, TMDB, and ML API clients. Unit tests should not require PostgreSQL or the ML API to be running.

Integration tests:

- Register -> pending login does not create a session, and review submission is rejected as unauthenticated.
- Admin approves user -> approved user can submit review -> classification stored.
- Guest cannot submit review.
- User cannot access admin API.
- User edits existing review -> classification is re-run.
- User soft-deletes their own review -> review no longer appears publicly.
- Admin can hide review and placeholder remains visible.
- Admin can delete review and placeholder remains visible.
- Database integration tests may require `TEST_DATABASE_URL`.
- ML integration tests may require `MODEL_API_BASE_URL` and `MODEL_API_KEY`.
- If these env vars are missing, integration tests should be skipped with a clear message.

Manual checks:

- Model API down.
- Invalid ML API key.
- Empty review.
- Very long review.
- Positive and negative animation states.
- Pending/rejected login status alerts.
- Admin approval flow.
- Admin moderation flow.
- Mobile layout.

Required verification commands:

```bash
pnpm prisma validate
pnpm prisma generate
pnpm lint
pnpm typecheck
pnpm test:unit
```

If database-dependent tests or migrations cannot run because PostgreSQL or the ML API is unavailable, the agent must state exactly which command failed and why.

If Prisma scripts are missing, add focused scripts to `package.json`, for example:

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:seed": "node prisma/seed.mjs"
}
```

## 16. Acceptance Criteria

- A new user can register, then must wait for admin approval before login creates an active session.
- An approved user can log in with username or email.
- A newly registered user cannot submit reviews until approved by admin.
- Admin can approve or reject pending users.
- An approved user can submit one review per movie or TV detail page.
- A user can edit their existing review for the same movie or TV show.
- A user can soft-delete their own review.
- The server calls `model_api` and stores label, confidence, and scores.
- User-facing review responses do not expose confidence or raw scores.
- Admin review pages show confidence and raw score details.
- Movie and TV detail pages show submitted reviews.
- Positive and negative submissions trigger distinct feedback animations.
- Guests can read reviews but cannot submit them.
- Admin-hidden/admin-deleted reviews keep a public placeholder message.
- The ML API key is never visible in browser source, network requests, or client config.
- App still fetches TMDB data through the local proxy.
- Existing movie browsing flows continue to work.

## 17. Implementation Phases

### Phase 1: Foundation

- Add database and migrations.
- Add auth/session system.
- Add role and approval status fields.
- Add `/api/auth/me`.
- Add admin seed script that creates the first admin from username, email, and password input.

### Phase 2: Approval and Profile

- Add registration pending state.
- Add profile page.
- Add admin approval queue.
- Enforce approval guard for review creation/editing.

### Phase 3: Review Storage and ML

- Add Review model.
- Add review create/list/edit API.
- Add review delete API for review owners.
- Add server-side model API client.
- Store classification result with review.
- Enforce one review per `(userId, tmdbMediaType, tmdbMediaId)`.
- Re-run classification on review edit.

### Phase 4: Movie and TV Detail UX

- Add review form to movie and TV Overview.
- Add edit mode.
- Add review list.
- Add loading, error, empty, and guest states.
- Add positive/negative feedback animation.

### Phase 5: Admin Moderation

- Add admin dashboard.
- Add review moderation table.
- Add hide/delete actions.
- Add public placeholder behavior.
- Add user list.

### Phase 6: Polish and Tests

- Add tests.
- Improve accessibility.
- Verify mobile layout.
- Verify model API failure behavior.
- Verify admin-only confidence visibility.

## 18. Final Product Decisions

- Use PostgreSQL.
- Use a seed script to create the first admin account.
- The admin seed script must accept username, email, and password.
- Pending users cannot create an active login session; show an approval-waiting alert.
- Rejected users cannot create an active login session; show a rejected-account alert.
- Users can edit and soft-delete their own reviews.
- Users are still limited to one review per movie/TV item.
- User-deleted reviews are not shown publicly.
- Admin-hidden/deleted review placeholders should show the original reviewer username.
- Use review status enum values `visible`, `hidden_by_admin`, `deleted_by_admin`, and `deleted_by_user`.

## 19. AI Agent Implementation Guardrails

To reduce implementation ambiguity, an AI agent should follow these defaults unless the project owner explicitly changes them:

- Use PostgreSQL + Prisma for the first implementation.
- Use Prisma string IDs with `cuid()`.
- Use `argon2id` for password hashing.
- Use an opaque `movies_session` HTTP-only cookie backed by the database `Session` table.
- The cookie stores the raw random session token; the database stores only its SHA-256 hash.
- Use the required dependencies listed in section 6. Do not add a full auth framework in V1.
- Use server-side Nuxt API routes for auth, review persistence, admin actions, and ML API calls.
- Do not call `model_api` from browser code.
- Keep `MODEL_API_KEY` server-only.
- Keep `MODEL_API_BASE_URL`, `MODEL_API_KEY`, `SESSION_SECRET`, `APP_ORIGIN`, and DB credentials out of `runtimeConfig.public`.
- `BASE_URL` may remain in `runtimeConfig.public` because this existing repo already uses it as the public TMDB proxy base URL.
- `BASE_URL` must point to the TMDB proxy, normally `http://localhost:3001`, not the Nuxt app.
- Create the first admin through a seed script that accepts username, email, and password.
- Do not create active sessions for pending or rejected users.
- Redirect pending login/registration flows to `/login?status=pending`; redirect rejected login attempts to `/login?status=rejected`.
- Because pending/rejected users have no session, detail pages treat them as guests and do not show pending/rejected review-form states.
- Allow users to edit and soft-delete their own reviews.
- Do not show user-deleted reviews publicly.
- Show reviewer username on admin-hidden/admin-deleted placeholders.
- Treat both user delete and admin delete as soft delete.
- Keep all UI copy in English.
- Because the existing repo uses `@nuxtjs/i18n`, add new user-facing copy to `internationalization/en.json` and use `$t(...)` in Vue templates unless the text is server-only.
- Do not translate every locale file in V1 unless explicitly requested; non-English locales may temporarily fall back to keys or existing i18n fallback behavior.
- Match the current dark cinematic theme; do not redesign the whole app.
- Do not add role-management UI unless explicitly requested later.
- Do not expose model confidence to normal users.
- Re-run sentiment classification every time a review is edited.
- Support both `movie` and `tv` media types from the start.
- Prefer small, focused components and server utilities over large all-in-one files.
- Browser review create/update payloads should send only `tmdbMediaType`, `tmdbMediaId`, and `content`; server code must fetch TMDB metadata for title/poster snapshots.
- Do not redesign existing browse, search, or detail flows.
- Keep `MediaDetails` tabs unchanged.
- Add the review module inside `components/media/Overview.vue` or a child component imported there.
- Add auth state through a composable, for example `composables/auth.ts`, backed by `GET /api/auth/me`.
- Update `components/NavBar.vue` only for auth/admin/profile links.
- Keep new route pages under `pages/login.vue`, `pages/register.vue`, `pages/profile.vue`, and `pages/admin/*.vue`.
- Update `.env.example` with required variable names but no real secrets.
- Do not edit the proxy app unless required for TMDB metadata fetch behavior.

## 20. Critical Clarifications

These clarifications are mandatory because they close common implementation gaps that can cause security bugs, stale authenticated UI, or moderation bypasses.

### 20.1 Phase and Prisma Migration Rules

- If implementing strictly phase-by-phase, Phase 1 must create only the Prisma setup plus `User`, `Session`, `UserRole`, and `ApprovalStatus`.
- If implementing strictly phase-by-phase, do not add the `Review` model or `User.reviews` / `User.moderatedReviews` relations until Phase 3.
- Phase 3 adds `Review`, `MediaType`, `SentimentLabel`, `ReviewStatus`, and the related `User` relations in a second migration.
- If the project owner explicitly asks the agent to implement multiple phases in one pass, the agent may create the full final Prisma schema in one migration.
- At every phase boundary, `pnpm prisma validate` must pass.

### 20.2 Auth, Admin, and API Caching

Authenticated, role-specific, and API responses must never be cached.

Update Nuxt/Nitro route rules so these paths are not cached in production:

```text
/api/**
/login
/register
/profile
/admin/**
```

Recommended route-rule behavior:

- Public browsing pages may keep the existing production cache behavior.
- `/api/**` should use no-store/no-cache response headers.
- `/login`, `/register`, `/profile`, and `/admin/**` should not use ISR/SWR/static caching.
- `GET /api/auth/me` must always reflect the current cookie/session state.

### 20.3 Review Moderation and Owner Actions

- Users may edit or soft-delete only their own `visible` reviews.
- Users may resubmit after their own review is `deleted_by_user`; the existing row must be reused, set back to `visible`, updated with new content, and reclassified.
- Users may not edit, restore, replace, or soft-delete reviews with status `hidden_by_admin` or `deleted_by_admin`.
- Admin-hidden and admin-deleted reviews remain auditable and visible publicly only through placeholder content.
- V1 does not support restoring admin-hidden or admin-deleted reviews to `visible`.

### 20.4 Admin Review Status Payload

`PATCH /api/admin/reviews/:id/status` must accept only this request shape:

```json
{
  "status": "hidden_by_admin",
  "moderationMessage": "Optional internal or public-safe moderation note."
}
```

Rules:

- `status` may be only `hidden_by_admin` or `deleted_by_admin`.
- Admin routes must not accept `visible` or `deleted_by_user` from this endpoint in V1.
- `moderationMessage` is optional, must be trimmed, and should have a practical maximum length such as 500 characters.
- The route must set `moderatedAt` and `moderatedById`.
- The public review endpoint must never return original content for admin-hidden or admin-deleted reviews.

### 20.5 Input Normalization

Registration and login must normalize identity fields consistently:

- `email`: trim and lowercase before validation, lookup, and storage.
- `username`: trim before validation, lookup, and storage.
- `username` length: 3-32 characters.
- `username` allowed characters: letters, numbers, underscore, dot, and hyphen.
- `password`: minimum 8 characters; do not silently trim passwords because spaces may be intentional.
- Login identifier: trim; if it contains `@`, treat email lookup as lowercase.

### 20.6 API Error Helper

Expected API errors must use a shared helper, for example `server/utils/api-error.ts`, so endpoints consistently return the PRD error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Readable message for the UI."
  }
}
```

Do not expose raw Nuxt/Nitro error output, stack traces, Prisma errors, database details, TMDB proxy errors, or ML API internals to the browser for expected failures.

### 20.7 Origin Configuration

Local V1 may use:

```text
APP_ORIGIN=http://localhost:3000
```

For deployment behind Cloudflare Zero Trust or any public domain, configure the deployed app origin explicitly. A future-compatible implementation may support comma-separated origins through `APP_ORIGINS`, but V1 must at minimum validate against the configured local or production app origin and must not validate against the TMDB proxy or ML API origin.

## 21. Technical Implementation Contract

This section is the implementation contract for AI agents. If another section is less specific, follow this section. If this section conflicts with an explicit project-owner instruction, follow the project-owner instruction.

### 21.1 Prisma Schema Contract

Use Prisma with PostgreSQL. The final schema must match this structure unless the project owner explicitly changes it. If implementing phase-by-phase, follow the migration rules in Section 20.1 and do not leave intermediate schemas invalid.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  admin
  user
}

enum ApprovalStatus {
  pending
  approved
  rejected
}

enum MediaType {
  movie
  tv
}

enum SentimentLabel {
  positive
  negative
}

enum ReviewStatus {
  visible
  hidden_by_admin
  deleted_by_admin
  deleted_by_user
}

model User {
  id             String         @id @default(cuid())
  username       String         @unique
  email          String         @unique
  passwordHash   String
  role           UserRole       @default(user)
  approvalStatus ApprovalStatus @default(pending)
  approvedAt     DateTime?
  approvedById   String?
  approvedBy     User?          @relation("UserApprover", fields: [approvedById], references: [id], onDelete: SetNull)
  approvedUsers  User[]         @relation("UserApprover")
  sessions       Session[]
  reviews        Review[]       @relation("UserReviews")
  moderatedReviews Review[]     @relation("ReviewModerator")
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([approvalStatus])
  @@index([role])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model Review {
  id                     String         @id @default(cuid())
  userId                 String
  user                   User           @relation("UserReviews", fields: [userId], references: [id], onDelete: Cascade)
  tmdbMediaType          MediaType
  tmdbMediaId            String
  tmdbTitleSnapshot      String
  tmdbPosterPathSnapshot String?
  content                String         @db.Text
  sentimentLabel         SentimentLabel
  sentimentConfidence    Float
  sentimentScoresJson    Json
  modelVersion           String?
  status                 ReviewStatus   @default(visible)
  moderationMessage      String?
  moderatedAt            DateTime?
  moderatedById          String?
  moderatedBy            User?          @relation("ReviewModerator", fields: [moderatedById], references: [id], onDelete: SetNull)
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt

  @@unique([userId, tmdbMediaType, tmdbMediaId])
  @@index([tmdbMediaType, tmdbMediaId, status])
  @@index([status])
  @@index([sentimentLabel])
  @@index([createdAt])
}
```

Phase 1 creates Prisma setup, `User`, `Session`, `UserRole`, and `ApprovalStatus`. Phase 3 adds `Review`, `MediaType`, `SentimentLabel`, `ReviewStatus`, and the `User` review/moderation relations if they were not already added. Do not leave the schema in a state where `pnpm prisma validate` fails.

### 21.2 Auth and Session Contract

- Do not use JWT, Nuxt Auth, NextAuth, Lucia, Supabase Auth, Firebase Auth, or any full authentication framework in V1.
- `SESSION_SECRET` is reserved for future use and must not change the opaque database-backed session design.
- The browser stores only the raw opaque session token in the `movies_session` HTTP-only cookie.
- The database stores only `sha256(rawSessionToken)` in `Session.tokenHash`.
- `GET /api/auth/me` is the source of truth for client auth state.
- Pending and rejected users never receive an active session.
- Mutating server routes must call a shared Origin validation helper before performing writes.
- Shared auth helpers should live under `server/utils/auth.ts`, `server/utils/session.ts`, and `server/utils/password.ts`.
- Auth and admin routes must follow the no-cache requirements in Section 20.2.

### 21.3 API Response Contract

All API errors should use this JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Readable message for the UI."
  }
}
```

Use these status codes:

- `400` for validation errors and invalid payloads.
- `401` for missing or expired authentication.
- `403` for authenticated users without required role or approval status.
- `404` for missing users, reviews, or media records.
- `409` for unique username/email conflicts.
- `429` for rate-limit failures.
- `502` for ML API failure, invalid ML response, or TMDB metadata fetch failure during review save.

`GET /api/auth/me` returns:

```json
{
  "user": {
    "id": "user_id",
    "username": "reviewer",
    "email": "reviewer@example.com",
    "role": "user",
    "approvalStatus": "approved",
    "createdAt": "2026-04-25T08:00:00.000Z"
  }
}
```

If unauthenticated, `GET /api/auth/me` returns `200` with:

```json
{
  "user": null
}
```

`POST /api/auth/register` returns:

```json
{
  "user": {
    "id": "user_id",
    "username": "reviewer",
    "email": "reviewer@example.com",
    "role": "user",
    "approvalStatus": "pending"
  },
  "redirectTo": "/login?status=pending"
}
```

`POST /api/auth/login` returns:

```json
{
  "user": {
    "id": "user_id",
    "username": "reviewer",
    "email": "reviewer@example.com",
    "role": "user",
    "approvalStatus": "approved"
  },
  "redirectTo": "/"
}
```

Pending and rejected login attempts do not create a cookie and return `403` with the shared error shape plus a redirect target:

```json
{
  "error": {
    "code": "ACCOUNT_PENDING",
    "message": "Your account is waiting for admin approval."
  },
  "redirectTo": "/login?status=pending"
}
```

`GET /api/reviews?type=movie&tmdbId=83533` returns only public-safe review data:

```json
{
  "reviews": [
    {
      "id": "review_id",
      "username": "reviewer",
      "tmdbMediaType": "movie",
      "tmdbMediaId": "83533",
      "content": "The visuals were beautiful.",
      "sentimentLabel": "positive",
      "status": "visible",
      "createdAt": "2026-04-25T08:00:00.000Z",
      "updatedAt": "2026-04-25T08:00:00.000Z"
    }
  ],
  "currentUserReview": null
}
```

For admin-hidden and admin-deleted reviews, the public endpoint must return placeholder content only and must not return the original review text.

`POST /api/reviews` and `PATCH /api/reviews/:id` return:

```json
{
  "review": {
    "id": "review_id",
    "content": "The visuals were beautiful.",
    "sentimentLabel": "positive",
    "status": "visible",
    "createdAt": "2026-04-25T08:00:00.000Z",
    "updatedAt": "2026-04-25T08:00:00.000Z"
  },
  "classification": {
    "label": "positive",
    "is_positive": true
  }
}
```

`DELETE /api/reviews/:id` soft-deletes the current user's own review and returns:

```json
{
  "review": {
    "id": "review_id",
    "status": "deleted_by_user"
  }
}
```

Admin list endpoints may include `email`, `sentimentConfidence`, `sentimentScoresJson`, and `modelVersion`. Public/user endpoints must not include raw confidence or raw scores.

`PATCH /api/admin/reviews/:id/status` must follow the request restrictions in Section 20.4 and returns:

```json
{
  "review": {
    "id": "review_id",
    "status": "hidden_by_admin",
    "moderatedAt": "2026-04-25T08:00:00.000Z",
    "moderatedById": "admin_user_id"
  }
}
```

### 21.4 Seed Script Contract

Add these package scripts if missing:

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:seed": "node prisma/seed.mjs"
}
```

The admin seed script must support this exact command shape:

```bash
pnpm db:seed -- --username admin --email admin@example.com --password "change-me-at-runtime"
```

Seed behavior:

- Create the user if the email and username do not exist.
- If the admin user already exists, update `role` to `admin` and `approvalStatus` to `approved`.
- Hash the provided password with argon2id.
- Never print the password or password hash.

### 21.5 Frontend Integration Contract

Use these exact frontend integration points unless the project owner changes them:

- Create `composables/auth.ts` for client auth state, backed by `GET /api/auth/me`.
- Create `components/review/MediaReviews.vue` for the media-detail review module.
- Create smaller review components only if they reduce complexity, for example `components/review/ReviewForm.vue`, `components/review/ReviewList.vue`, and `components/review/SentimentFeedback.vue`.
- Render the review module in `components/media/Overview.vue` immediately after `<MediaInfo :item="item" :type="type" />` and before the Cast carousel.
- Do not change `components/media/Details.vue` tab behavior.
- Do not redesign `pages/[type]/[id].vue`, `components/media/Hero.vue`, or existing browse/search pages.
- Update `components/NavBar.vue` only to add auth/admin/profile/logout navigation.
- Keep `NavBar` visually icon-first and compact. Preferred icons: login `i-ph-sign-in`, register `i-ph-user-plus`, profile `i-ph-user-circle`, admin `i-ph-shield`, logout `i-ph-sign-out`.
- Add user-facing copy to `internationalization/en.json` and use `$t(...)` in Vue templates.
- Do not translate every non-English locale in V1 unless explicitly requested.
- Auth/admin pages must not depend on cached auth state; they should refresh or invalidate `GET /api/auth/me` after login, logout, approval-sensitive actions, and session errors.

Required pages:

```text
pages/login.vue
pages/register.vue
pages/profile.vue
pages/admin/index.vue
pages/admin/approvals.vue
pages/admin/reviews.vue
pages/admin/users.vue
```

### 21.6 Server File Contract

Use this server layout unless a simpler equivalent is clearly justified:

```text
server/api/auth/register.post.ts
server/api/auth/login.post.ts
server/api/auth/logout.post.ts
server/api/auth/me.get.ts

server/api/reviews/index.get.ts
server/api/reviews/index.post.ts
server/api/reviews/[id].patch.ts
server/api/reviews/[id].delete.ts
server/api/user/reviews.get.ts

server/api/admin/index.get.ts
server/api/admin/approvals/index.get.ts
server/api/admin/approvals/[userId]/approve.post.ts
server/api/admin/approvals/[userId]/reject.post.ts
server/api/admin/reviews/index.get.ts
server/api/admin/reviews/[id]/status.patch.ts
server/api/admin/users.get.ts

server/utils/prisma.ts
server/utils/auth.ts
server/utils/session.ts
server/utils/password.ts
server/utils/rate-limit.ts
server/utils/csrf.ts
server/utils/api-error.ts
server/utils/reviews.ts
server/utils/model-api.ts
server/utils/tmdb.ts
```

Do not edit the `proxy/` workspace unless review submission cannot fetch TMDB metadata through the existing TMDB proxy route.

### 21.7 Per-Phase File Scope and Verification

Phase 1 allowed scope:

- `package.json`
- `pnpm-lock.yaml`
- `nuxt.config.ts`
- `.env.example`
- `prisma/**`
- `server/utils/prisma.ts`
- `server/utils/auth.ts`
- `server/utils/session.ts`
- `server/utils/password.ts`
- `server/utils/csrf.ts`
- `server/utils/rate-limit.ts`
- `server/utils/api-error.ts`
- `server/api/auth/me.get.ts`
- focused tests for auth/session utilities

Phase 1 verification:

```bash
pnpm prisma validate
pnpm prisma generate
pnpm lint
pnpm typecheck
pnpm test:unit
```

Phase 2 allowed scope:

- auth API routes
- login/register/profile pages
- admin approvals API and page
- `components/NavBar.vue`
- `composables/auth.ts`
- `internationalization/en.json`
- focused tests for registration, login, approval guards, and auth UI states

Phase 2 verification:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

Phase 3 allowed scope:

- Review Prisma model and migration
- review API routes
- `server/utils/reviews.ts`
- `server/utils/model-api.ts`
- `server/utils/tmdb.ts`
- `server/api/user/reviews.get.ts`
- focused tests for review validation, one-review-per-media, model API success/failure, and owner authorization

Phase 3 verification:

```bash
pnpm prisma validate
pnpm prisma generate
pnpm lint
pnpm typecheck
pnpm test:unit
```

Phase 4 allowed scope:

- `components/media/Overview.vue`
- `components/review/**`
- `composables/auth.ts`
- `internationalization/en.json`
- focused component tests for review form/list/feedback states

Phase 4 verification:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

Phase 5 allowed scope:

- admin API routes
- admin pages
- admin navigation additions
- `internationalization/en.json`
- focused tests for admin authorization, approval, moderation, and admin-only confidence visibility

Phase 5 verification:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

Phase 6 allowed scope:

- accessibility fixes
- mobile/responsive polish
- additional unit, integration, or e2e tests
- small refactors needed to make tests reliable

Phase 6 verification:

```bash
pnpm prisma validate
pnpm prisma generate
pnpm lint
pnpm typecheck
pnpm test:unit
```

If PostgreSQL, the TMDB proxy, or the ML API is unavailable, the agent must still run all non-dependent verification commands and report the exact skipped or failed command with the reason.
