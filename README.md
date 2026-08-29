# Amar School — Team Onboarding Guide

Repo structure:

```
amar-school/
├── backend/                     Express + MongoDB API
├── frontend/                    React + Tailwind app (the shared platform - auth, dashboard, all features)
├── frontend-nextjs-admissions/  Fahmida's admission work (Next.js/TS) - NOT wired into the main app yet, see note below
└── README.md
```

MongoDB Atlas and the GitHub repo are already set up. This guide is for
getting your own machine running and contributing your feature.

---

## ⚠️ Read this before creating any new file or folder

On **Aug 15**, a folder named `Frontend` (capital F) got created alongside
the existing `frontend`. On Mac/Windows this silently merges into ONE folder
on disk (those filesystems are case-insensitive, GitHub is not), which
corrupted checkouts for anyone who pulled it. It's fixed now, but the fix was
a rename, not a delete — `frontend-nextjs-admissions/` is that recovered work.

**The rule going forward:** never name a new file or folder something that
differs from an existing one _only_ by capitalization. If you're not sure,
ask in the group chat before pushing a new top-level folder.

---

## Current Status

| Module     | Feature                                                                                                   | Owner   | Status                                                                                                                                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Foundation | Auth, roles, School registration + Super Admin approval                                                   | Shafin  | ✅ Done                                                                                                                                                                                                                              |
| Module 1   | School Website Builder                                                                                    | Shafin  | ✅ Done                                                                                                                                                                                                                              |
| Module 2   | Teacher Management                                                                                        | Shafin  | ✅ Done                                                                                                                                                                                                                              |
| Module 1   | School Profile Management                                                                                 | Annama  | ✅ Done                                                                                                                                                                                                                       |
| Module 1   | Notice & Event Management                                                                                 | Tanvir  | ✅ Done                                                                                                                                                                                                                              |
| Module 1   | Admission Management                                                                                      | Mahima  | ✅ Done                                                                                                                                                                                                                              |
| Module 2   | Student Management                                                                                        | Mahima  | ✅ Done
                                                                                                                                               |
| Module 3   | Student and Analytical Dashboard                                                                                        | Mahima  | ✅ Done



 

---

## 1. Clone the Repo

```bash
git clone https://github.com/HasiburRahmanShafin/amar-school.git
cd amar-school
```

## 2. Get the Shared Environment Variables

Ask the team lead for these (sent privately — never post them in the group
chat history or commit them):

- `MONGO_URI`
- `JWT_SECRET`
- `EMAIL_USER` / `EMAIL_PASS`
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`

Everyone uses the **same** `MONGO_URI` — we're all working against one shared
Atlas database so admissions, students, attendance etc. stay consistent
across the team. Don't create your own separate cluster.

Then create your local env files:

```bash
cd backend
cp .env.example .env
# paste in the shared values

cd ../frontend
cp .env.example .env
# REACT_APP_API_BASE_URL=http://localhost:5000/api is fine as-is
```

`.env` is gitignored — it will never show up in `git status`. If it does,
stop and check you're not about to commit secrets.

## 3. Install & Run

```bash
# Terminal 1
cd backend
npm install
npm run dev
```

Confirm it's up: `http://localhost:5000/api/health`

```bash
# Terminal 2
cd frontend
npm install
npm start
```

Opens `http://localhost:3000`. (`npm install` will pull in `multer` and
`leaflet` automatically now that they're in `package.json` — nothing extra
to set up for those.)

You do **not** need to run `npm run seed:superadmin` — the Super Admin account
already exists in the shared database. Ask the team lead for its login if you
need to test the approval flow.

## 4. Confirm You're Connected

Log in at `http://localhost:3000/login` with credentials the team lead gives
you, or register a test school at `/register-school` and check it shows up
under Super Admin → pending schools. If it does, you're talking to the shared
DB correctly.

---

## 5. Git Workflow (do this for every feature)

```bash
# One-time: make sure commits are attributed to you
git config user.name "Your Full Name"
git config user.email "your-github-email@example.com"

# Before starting new work
git checkout main
git pull

# Create your feature branch
git checkout -b feature/<yourname>-<feature-slug>
# e.g. feature/annama-profile-management

# Work, commit in small meaningful chunks (not one giant commit at the end)
git add .
git commit -m "feat: add school profile edit form"

# Push your branch
git push -u origin feature/<yourname>-<feature-slug>
```

Then open a **Pull Request** on GitHub (`base: main` ← `compare: your branch`),
get it reviewed if possible, and merge. Afterward:

```bash
git checkout main
git pull
git branch -d feature/<yourname>-<feature-slug>
```

**Branch naming:** `feature/<name>-<short-feature-name>`
**Commit prefixes:** `feat:` new feature · `fix:` bug fix · `chore:` config/setup · `docs:` documentation

**Ground rules:**

- Commit your own work from your own machine/GitHub account — don't batch
  someone else's changes into your commit. GitHub's Contributors graph is how
  individual contribution gets checked.
- Pull `main` before you branch, to avoid painful merge conflicts later.
- Small, frequent commits > one huge commit at the end.
- Never create a top-level file/folder without checking it doesn't collide
  (case-insensitively) with something that already exists — see the warning
  at the top of this file.

---

## 6. Where Your Feature Goes

```
backend/src/models/<YourFeature>.js         # Mongoose schema
backend/src/controllers/<yourFeature>.controller.js
backend/src/routes/<yourFeature>.routes.js  # protect + authorize + tenant-scope
frontend/src/pages/admin/<YourFeature>.js   # (or teacher/ or student/)
frontend/src/routes/AppRoutes.js            # add your route here
```

Protect and scope every route the same way the existing ones do:

```js
router.use(protect, authorize("school_admin")); // or 'teacher' / 'student'
// inside the controller, filter your Mongoose queries by req.user.schoolId
```

**Want a worked example?** The Website Builder (`backend/src/controllers/website.controller.js`

- `gallery.controller.js`, `frontend/src/pages/admin/WebsiteBuilder.js` +
  `GalleryManager.js`) is the most complete reference in the repo right now —
  public vs. protected routes, tenant scoping, an external API integration
  (OpenStreetMap), and image handling are all in there. Worth a skim before
  starting your own feature.

Existing pieces you'll be building on top of:

| File                                          | Responsibility                                    |
| --------------------------------------------- | ------------------------------------------------- |
| `backend/src/middleware/auth.middleware.js`   | Verifies JWT, attaches `req.user`                 |
| `backend/src/middleware/role.middleware.js`   | `authorize('school_admin')` — role guard          |
| `backend/src/middleware/tenant.middleware.js` | Gives you `req.schoolId` to scope queries         |
| `frontend/src/context/AuthContext.js`         | Current logged-in user + `loginUser`/`logoutUser` |
| `frontend/src/routes/ProtectedRoute.js`       | Wrap your page to require login/role              |

---

## 7. Quick Command Reference

| Task                            | Command                           |
| ------------------------------- | --------------------------------- |
| Check what will be committed    | `git status`                      |
| See commit history              | `git log --oneline --graph --all` |
| Switch branches                 | `git checkout <branch>`           |
| Create + switch to new branch   | `git checkout -b <branch>`        |
| Pull latest from GitHub         | `git pull`                        |
| Push current branch             | `git push`                        |
| Discard local changes to a file | `git checkout -- <file>`          |
