# Continuous integration

`workflows/ci.yml` runs on pushes to `develop` and pull requests targeting `main`.
The independent jobs are **Backend unit tests** (Python 3.13) and **Frontend checks**
(Node.js 22). Every command must succeed. The workflow has read-only repository
permissions and does not merge, deploy, or use production secrets.

Backend unit tests use the existing isolated fixtures and mocks. They need no
running PostgreSQL, Redis, Bird, or other external service. Database integration
and Playwright browser tests remain separate local checks; they are not CI gates.

Run the same checks locally from the repository root (PowerShell):

```powershell
Push-Location Ihmom-StoreAPI
python -m pip install -r requirements-dev.txt
python -m pytest tests/unit
Pop-Location

Push-Location Ihmom-StoreUI
npm ci
npm test
npm run lint
npx tsc -b --pretty false
npm run build
Pop-Location
```

The browser suite uses the real compiled frontend and
the existing disposable test database, never the development database:

```powershell
docker compose -f Ihmom-StoreAPI/tests/docker-compose.test.yml up -d --wait
Push-Location Ihmom-StoreUI
npx playwright install chromium
npm run test:browser
Pop-Location
# Stop only a test stack you started; do not add -v.
docker compose -f Ihmom-StoreAPI/tests/docker-compose.test.yml down
```

## Manual protection of main

After you push the workflow to `develop` and open a pull request targeting `main`,
let both jobs run so their check names become selectable. In GitHub, open
**Settings > Branches > Add classic branch protection rule**, and set:

- Branch name pattern: `main`.
- **Require a pull request before merging**, with **1 required approval** and
  **Dismiss stale pull request approvals when new commits are pushed**.
- **Require status checks to pass before merging**: select **Backend unit tests**
  and **Frontend checks** from GitHub Actions.
- **Require branches to be up to date before merging**.
- **Require conversation resolution before merging**.
- **Do not allow bypassing the above settings**.
- Leave **Allow force pushes** and **Allow deletions** disabled.

Save the rule. Repository permissions and plan must support branch protection.
No repository settings are changed by this workflow. See GitHub's
[branch protection instructions](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule).

## Verification and known limitations

Local verification on 2026-11-15:

- Backend unit tests: **133 passed**, one existing Starlette/httpx deprecation warning.
- Frontend unit tests: **63 passed**. Two stale catalog seed tests were updated to
  assert the existing JSON storage format and 24-hour expiration, including expiry
  boundaries and invalid legacy storage; catalog runtime behavior was unchanged.
- The new compiled-browser product create/edit regression failed before the fix
  (the selected category label stayed empty), then passed after replacing the
  form's `watch()` reads with `useWatch()` subscriptions. The shared select itself
  needed no implementation changes.
- Full browser suite: **18 passed, 0 failed, 0 skipped**. The image upload test
  now uses a valid in-memory PNG instead of a missing production favicon. The
  taxonomy assertion selects the visible responsive row instead of the first
  DOM match. Application behavior and production assets were unchanged.
- Unit coverage includes immediate labels, submitted IDs, edit/reset behavior,
  async options, Arabic/English labels, search, clearing, and keyboard selection.
  Vitest does not run React Compiler; the browser regression is essential to
  reproduce this particular defect.
- The exact install commands succeeded (`pip install -r requirements-dev.txt`
  and `npm ci`). Backend unit tests also passed with the disposable database and
  Redis containers stopped. No backend test infrastructure changes were needed.
- TypeScript validation and the production build passed. ESLint exited
  successfully with **0 errors and 9 warnings** in unchanged components/hooks.
  The build retains the existing warning for a JavaScript chunk over 500 kB.
- `npm ci` reported **21 dependency vulnerabilities** (2 low, 16 moderate,
  3 high) in the existing lockfile. No dependency upgrades or audit fixes were
  applied as part of this targeted form/CI change.
- The workflow passed **actionlint 1.7.11**, downloaded from its official release
  and checked against its published SHA-256 checksum. Git diff whitespace checks
  passed. No coverage percentage was measured for this change.

GitHub-hosted execution and enforcement require the manual push and protection
steps above; local validation cannot confirm repository settings or runner results.
