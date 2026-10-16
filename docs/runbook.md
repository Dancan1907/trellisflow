# TrellisFlow — Runbook

Recovery procedures and common fixes. Keep this document short, actionable, and up to date.

---

## Local Development Issues

### API fails to start with `Cannot find module '.../dist/main'`

**Cause:** Stale TypeScript incremental build information (`tsconfig.tsbuildinfo`) may cause TypeScript to skip emitting files into `dist/`.

**Fix:**

```bash
cd apps/api
rm -f tsconfig.tsbuildinfo
pnpm exec nest build
pnpm dev
```

On Windows PowerShell, use `Remove-Item tsconfig.tsbuildinfo -ErrorAction SilentlyContinue` instead of `rm -f`.

### `ERR_MODULE_NOT_FOUND` on ESLint configuration

**Cause:** A `.js` file is being treated as an ES module because the root `package.json` contains `"type": "module"`, but the file uses CommonJS syntax.

**Fix:** Choose the option that matches the intended module system:

- Rename the configuration file to `.mjs` and convert it to ES module syntax.
- Rename the configuration file to `.cjs` and keep CommonJS syntax.

Update any references to the configuration file if necessary.

### Multiple versions of pnpm specified in CI

**Cause:** The pnpm version is declared in both `package.json` through the `packageManager` field and the GitHub Actions workflow through the setup action's `version` input.

**Fix:** Choose one authoritative version declaration. Prefer keeping the version in `package.json` and configuring `pnpm/action-setup` to read it, avoiding conflicting version values.

### Git hooks fail: `eslint is not recognized`

**Cause:** ESLint may not be installed in the workspace where the Git hook executes, or the hook may not be resolving the workspace binaries correctly.

**Fix:** If ESLint and the related configuration packages are missing from the workspace root, install them:

```bash
pnpm add -D -w eslint @eslint/js typescript-eslint eslint-config-prettier
```

Then reinstall dependencies if necessary and retry the commit. Verify that the hook uses the appropriate workspace configuration.

### Git push hangs or fails with HTTP 408

**Cause:** A timeout may occur during the HTTP connection to the Git remote.

**Diagnosis:**

```bash
git remote -v
git status
```

**Fix:** Check your network connection and Git hosting service status. If the problem persists, try switching the Git HTTP version:

```bash
git config --global http.version HTTP/1.1
```

If necessary, check repository size, large files, authentication, and proxy settings. Avoid changing `http.postBuffer` as a default fix; it generally does not resolve ordinary network timeouts.

---

## Deployment Issues

### Render build fails because `NODE_ENV=production` skips development dependencies

**Cause:** Build-time tools such as the NestJS CLI and TypeScript may be listed as development dependencies, but the build environment installs only production dependencies.

**Fix:** Ensure development dependencies are installed during the build phase. For example:

```bash
pnpm install --frozen-lockfile --prod=false
pnpm build
```

Keep the runtime environment configured appropriately for production. Do not rely on setting `NODE_ENV=development` for the entire deployed application.

### Vercel build fails: Next.js inferred your workspace root

**Cause:** Next.js may detect multiple lockfiles or infer an unintended workspace root.

**Diagnosis:**

- Check for unintended lockfiles outside or inside the repository.
- Confirm that Vercel is configured to use the correct monorepo root.
- Review the build logs to identify which directory Next.js inferred.

**Fix:**

- Remove unintended lockfiles only after confirming they are not required.
- Configure Vercel's Root Directory and build settings correctly.
- If required, configure `outputFileTracingRoot` in `next.config.ts` to point to the monorepo root.

### Neon connection pool exhausted

**Cause:** Too many concurrent database connections may be opened by application instances or serverless functions.

**Fix:**

- Use Neon's pooled connection string for application workloads where appropriate.
- Use the direct connection string for migrations or other tasks that require it.
- Review Prisma connection management, concurrency, and database connection limits.
- Check whether multiple application instances are creating unnecessary connections.

Confirm the connection string format in the Neon dashboard rather than assuming a particular hostname format.

---

## Runtime Issues

### User reports that a value changed unexpectedly

**Example:** A user reports that a balance or other financial value was correct yesterday but is incorrect today.

**Diagnosis:**

1. Identify the affected entity and user.
2. Check the audit log for changes to the entity.
3. Compare the recorded before-and-after values.
4. Review recent transactions, background jobs, and related application logs.

Example SQL query:

```sql
SELECT *
FROM audit_logs
WHERE entity_id = '<entity_id>'
ORDER BY created_at DESC;
```

Replace `<entity_id>` with the actual entity identifier.

Verify that the table and column names match the database schema. Restrict access to audit records because they may contain sensitive financial information.

### Summaries stopped arriving from an external business

**Diagnosis:**

1. Check `external_business_sources.last_summary_at` for the affected business.
2. Check `api_tokens` to determine whether the relevant token has expired or been revoked.
3. Inspect the external system's logs for failed POST requests and HTTP error responses.
4. Check API rate limits and authentication failures.
5. Verify that the external integration endpoint is available.

**Common fixes:**

- **Expired or revoked token:** Issue or rotate the token through the appropriate TrellisFlow settings or administrative process.
- **External system unavailable:** Restore the external service or retry the request when it becomes available.
- **Rate limited:** Reduce request frequency and implement appropriate retry handling.
- **Invalid payload:** Compare the submitted request with the documented API schema.
- **Network or server error:** Inspect application logs and retry safely when appropriate.

Ensure retries do not create duplicate financial records.

### Dashboard shows the wrong net worth

**Diagnosis:**

1. Check the account's displayed or cached balance against the authoritative financial records.
2. Review transactions for missing entries, duplicates, or incorrect amounts.
3. Verify that investment valuations and supported business summaries are current.
4. Check background job execution and application logs.
5. Confirm that the net worth calculation includes only the intended accounts, investments, and business values.

**Fix:** If the project has a balance recomputation job, use the configured job runner to execute it.

For example, if `nightly-balance-recompute` is an actual registered job and the repository provides a matching CLI command:

```bash
pnpm job nightly-balance-recompute
```

Verify the real job name and invocation method before running the command. Do not assume this command exists if it has not been implemented.

Reconcile the affected balances and verify the resulting net worth before considering the incident resolved.

---

## Database Recovery

### Restore from backup

1. Identify the recovery point you need.
2. Open the Neon dashboard and locate the appropriate project and branch.
3. Use the available restore or point-in-time recovery workflow to create a restored branch, where supported by your plan and configuration.
4. Verify the restored data before directing application traffic to it.
5. Update the application's database configuration if the restored branch is to become active.
6. Verify authentication, financial records, and critical application workflows.

**Important:** Confirm the recovery procedure and retention window available for your Neon project before starting. Avoid overwriting the current production branch until the restored data has been verified.

### Emergency: rotate JWT secrets

Rotating JWT secrets may invalidate existing access and refresh tokens, requiring users to authenticate again.

Generate new secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Perform the rotation carefully:

1. Confirm the names of the JWT secrets configured by the application.
2. Generate new, independent secrets for access and refresh tokens.
3. Update the corresponding environment variables in the deployment platform.
4. Redeploy or restart the application as required.
5. Verify that new logins work and old tokens are rejected as expected.

If the application uses multiple instances, coordinate the rotation to avoid inconsistent authentication behavior. Account for any token-validation or refresh-token storage strategy before executing the change.

### Emergency: revoke all API tokens

If all active external API tokens must be revoked, first confirm the schema and the intended scope of the operation.

Example SQL, assuming the listed table and columns exist:

```sql
UPDATE api_tokens
SET
    status = 'revoked',
    revoked_at = NOW(),
    revoked_reason = 'Emergency rotation'
WHERE status = 'active';
```

Before executing:

- Confirm that revoking every active token is necessary.
- Ensure you have an authorized database connection and a recovery plan.
- Consider running the statement in a transaction if supported by your operational procedure.
- Verify that the application recognizes the `revoked` status.
- Notify affected integration owners and issue replacement tokens through the approved process.

This operation affects all matching active tokens and may interrupt external business integrations.

---

## CI/CD Issues

### CI passes locally but fails on GitHub

**Common causes:**

- **Node.js version mismatch:** Compare `.nvmrc`, the root `package.json`, and the Node.js version configured in the workflow.
- **Missing environment variables:** Verify that required CI variables and secrets are configured.
- **Case-sensitive file paths:** Linux runners distinguish between uppercase and lowercase filenames, unlike some local Windows configurations.
- **Line endings:** Check `.gitattributes` and ensure consistent CRLF/LF handling.
- **Dependency differences:** Confirm that CI uses the lockfile and a frozen installation.
- **Database setup:** Verify that test databases, migrations, and required services are available to the workflow.

**Fix:** Reproduce the failing command locally, inspect the complete GitHub Actions log, and correct the underlying configuration or code issue.

### Deployment succeeded but the site shows an old version

**Diagnosis:**

1. Confirm that the deployment contains the expected commit.
2. Check that the correct branch and environment were deployed.
3. Inspect deployment logs for build or runtime errors.
4. Determine whether browser caching, a CDN, or service-worker caching is involved.

**Fix:**

- Perform a hard refresh using `Ctrl+Shift+R`.
- Verify the active deployment in the hosting dashboard.
- Clear or invalidate relevant caches only when necessary.
- Redeploy if the active deployment does not contain the expected changes.

---

## When to Escalate

If a problem is not covered by this runbook, do not guess at a fix.

1. Record the error message and the steps taken so far.
2. Check the relevant chapter in `docs/` for the intended design and implementation.
3. Review recent changes to affected files using `git log`.
4. Inspect application, database, and CI/CD logs as appropriate.
5. Open a GitHub issue if the problem recurs or needs a permanent fix.
6. Update this runbook when a new, verified recovery procedure is established.

---

**Maintenance rule:** Keep this runbook aligned with the actual codebase, database schema, deployment configuration, and available operational commands. Verify commands and schema names before executing recovery procedures in production.
