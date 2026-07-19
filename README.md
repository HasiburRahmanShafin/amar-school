# Amar School — Setup Guide (MongoDB Atlas → GitHub)

Monorepo structure:

```
amar-school/            ← main GitHub repo
├── backend/             ← Express + MongoDB API
├── frontend/             ← React + Tailwind app
├── .gitignore
└── README.md
```

Follow this guide in order: **Atlas → local env → run it → git init → GitHub → team workflow.**

---

## Part 1 — MongoDB Atlas Setup

1. Go to **[mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)** and create a free account (or sign in with Google).
2. **Create a Project** → name it `Amar School`.
3. Click **Build a Database** → choose the **M0 Free** tier.
   - Provider: AWS (or any).
   - Region: pick one close to you (e.g. Mumbai `ap-south-1` is usually closest for Bangladesh).
   - Cluster name: `Cluster0` is fine — leave default.
4. Click **Create** — provisioning takes 1–3 minutes.
5. **Database Access** (left sidebar) → **Add New Database User**:
   - Authentication: Password.
   - Username: e.g. `amarschool_admin`.
   - Password: click **Autogenerate Secure Password** and **save it somewhere** — you'll need it in `.env`. (If you pick your own password, avoid `@ / : ?` characters — they need URL-encoding in the connection string.)
   - Database User Privileges: **Read and write to any database**.
   - Click **Add User**.
6. **Network Access** (left sidebar) → **Add IP Address**:
   - For development, click **Allow Access from Anywhere** (`0.0.0.0/0`). This is fine for a course project; you'd lock it down for real production.
   - Click **Confirm**.
7. Go back to **Database** → click **Connect** on your cluster → **Drivers** → select **Node.js**.
8. Copy the connection string. It looks like:
   ```
   mongodb+srv://amarschool_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
9. Replace `<password>` with your real password, and add your database name right before the `?`:
   ```
   mongodb+srv://amarschool_admin:YourPassword123@cluster0.xxxxx.mongodb.net/amar-school?retryWrites=true&w=majority
   ```
   This full string is your `MONGO_URI`.

---

## Part 2 — Local Environment Setup

### Backend

```bash
cd amar-school/backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

```
MONGO_URI=<paste the connection string from Part 1>
JWT_SECRET=<run: openssl rand -hex 32>
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=<Gmail App Password — see note below>
SUPERADMIN_EMAIL=superadmin@amarschool.com
SUPERADMIN_PASSWORD=ChangeThisPassword123
```

**Gmail App Password:** your normal Gmail password won't work with Nodemailer.
Go to your Google Account → **Security** → enable **2-Step Verification** →
**App Passwords** → generate one for "Mail" → paste the 16-character code as `EMAIL_PASS`.

Seed the first Super Admin (one-time):

```bash
npm run seed:superadmin
```

Start the backend:

```bash
npm run dev
```

Confirm it's working: open `http://localhost:5000/api/health` → should return
`{"status":"ok",...}`.

### Frontend

```bash
cd amar-school/frontend
npm install
cp .env.example .env
npm start
```

Opens `http://localhost:3000`.

### Test the flow

1. `/register-school` → submit a new school.
2. Try logging in as that admin → blocked with "pending approval" message.
3. Log in as Super Admin (your `.env` credentials) → `/superadmin/schools` → **Approve**.
4. Log back in as the school admin → lands on `/admin/dashboard`.

---

## Part 3 — Initialize Git Locally

From the **root** of `amar-school/` (not inside backend or frontend):

```bash
cd amar-school
git init
git add .
git status
```

Check the output of `git status` — you should **not** see `node_modules/` or `.env`
listed. If you do, the `.gitignore` isn't being picked up; make sure you're running
this from the `amar-school/` root where `.gitignore` lives.

```bash
git commit -m "chore: initial project scaffold - folder structure, shared auth/role system, school registration and Super Admin approval flow"
```

---

## Part 4 — Create the GitHub Repository

1. Go to **[github.com/new](https://github.com/new)**.
2. Repository name: `amar-school`.
3. Visibility: **Private** is recommended for a course project (you can add teammates as collaborators either way).
4. **Do NOT** check "Add a README file", "Add .gitignore", or "Choose a license" — you already have all of that locally. Checking these creates conflicting history you'd have to merge on your very first push.
5. Click **Create repository**. GitHub will show you a page with setup commands — ignore it, use the commands below instead (yours already has commits).

---

## Part 5 — Push to GitHub

```bash
git remote add origin https://github.com/<your-github-username>/amar-school.git
git branch -M main
git push -u origin main
```

If prompted for credentials and password auth fails (GitHub disabled password auth
for git operations), you'll need a **Personal Access Token**: GitHub → Settings →
Developer settings → Personal access tokens → Tokens (classic) → Generate new token
→ check the `repo` scope → use that token as your password when pushing. Or set up
SSH keys instead (`git remote set-url origin git@github.com:<user>/amar-school.git`)
if you prefer.

Refresh the GitHub page — your code should now be there.

---

## Part 6 — Add Your Teammates

Repo → **Settings** → **Collaborators** → **Add people** → enter each teammate's
GitHub username or email → they'll get an invite email to accept.

---

## Part 7 — Team Git Workflow (this is what gets graded)

Each member, for every feature:

```bash
# 1. Clone once (first time only)
git clone https://github.com/<owner>/amar-school.git
cd amar-school

# 2. Set your identity so commits are attributed to YOU, not a generic user
git config user.name "Your Full Name"
git config user.email "your-github-email@example.com"

# 3. Before starting new work, sync with main
git checkout main
git pull

# 4. Create a feature branch — one per feature
git checkout -b feature/<yourname>-<feature-slug>
# e.g. feature/shafin-website-builder

# 5. Work, then commit in small, meaningful chunks (not one giant commit)
git add .
git commit -m "feat: add school website builder homepage editor"

# 6. Push your branch
git push -u origin feature/shafin-website-builder

# 7. Open a Pull Request on GitHub: base=main, compare=your branch
#    Review it (or have a teammate review), then Merge.

# 8. After merging, clean up
git checkout main
git pull
git branch -d feature/shafin-website-builder
```

**Branch naming:** `feature/<name>-<short-feature-name>`, e.g.
`feature/annama-attendance-management`, `feature/tanvir-notice-management`.

**Commit message convention** (not mandatory, but reads well in the graded history):
`feat: ...` new feature, `fix: ...` bug fix, `chore: ...` config/setup, `docs: ...` documentation.

**Important for grading:** don't have one person run `git add . && git commit` for
everyone's work. Each member commits their own code from their own machine/account —
GitHub's **Insights → Contributors** graph is how individual contribution gets
verified, and that only works if commits are actually authored by each person.

---

## Part 8 — Quick Command Reference

| Task                            | Command                            |
| ------------------------------- | ---------------------------------- |
| Check what will be committed    | `git status`                       |
| See commit history              | `git log --oneline --graph --all`  |
| Switch branches                 | `git checkout <branch>`            |
| Create + switch to new branch   | `git checkout -b <branch>`         |
| Pull latest from GitHub         | `git pull`                         |
| Push current branch             | `git push`                         |
| See who committed what          | `git shortlog -sn` (after cloning) |
| Discard local changes to a file | `git checkout -- <file>`           |

---

## What Each Piece Does (for viva / AI-code explanation requirement)

| File                                               | Responsibility                                             |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `backend/src/models/School.js`, `User.js`          | Data shape + password hashing (`bcrypt` pre-save hook)     |
| `backend/src/middleware/auth.middleware.js`        | Verifies JWT, attaches `req.user = { id, role, schoolId }` |
| `backend/src/middleware/role.middleware.js`        | `authorize('super_admin')` — blocks routes by role         |
| `backend/src/middleware/tenant.middleware.js`      | Scopes future feature queries to `req.schoolId`            |
| `backend/src/controllers/auth.controller.js`       | Registration, login (pending/rejected checks), `/me`       |
| `backend/src/controllers/superadmin.controller.js` | List/approve/reject schools, triggers emails               |
| `backend/src/utils/seedSuperAdmin.js`              | One-time script creating the first Super Admin             |
| `frontend/src/context/AuthContext.js`              | Holds logged-in user, exposes `loginUser`/`logoutUser`     |
| `frontend/src/routes/ProtectedRoute.js`            | Redirects unauthenticated/wrong-role users                 |

---

## Next: Module 1 (Lab 5)

Each member builds their first feature on top of this base — new model, controller,
routes (protected with `protect` + `authorize('school_admin')`, scoped with
`req.schoolId`), and a matching page under `frontend/src/pages/admin/`, wired into
`AppRoutes.js`. Branch, commit, push, PR — per the workflow above.
