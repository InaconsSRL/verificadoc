Run a comprehensive code quality audit of this project.

Read the project root to determine language and framework. Check for files like package.json, Cargo.toml, pyproject.toml, go.mod, pom.xml, build.gradle, *.sln, Gemfile, or similar. Also check for tsconfig.json, .eslintrc*, CLAUDE.md, and any linting/formatting config.

Launch ALL 6 of the following Task agents in a SINGLE message so they run in parallel:

## Agent 1 — Code standards
Check for: inconsistent naming conventions, dead code, overly complex functions (>50 lines), missing error handling, hardcoded values that should be constants or env vars. Return findings as [HIGH|MEDIUM|LOW] description — file:line. Max 15 findings.

## Agent 2 — Code duplication
Find duplicated logic blocks (>10 lines repeated), copy-pasted functions with minor variations, repeated patterns that should be extracted into utilities. Return findings as [HIGH|MEDIUM|LOW] description — file:line. Max 15 findings.

## Agent 3 — Logging & debug artifacts
Look for: raw console.log/print statements in production code, commented-out debug code, TODO/FIXME/HACK comments, sensitive data in logs (tokens, passwords, API keys). Return findings as [HIGH|MEDIUM|LOW] description — file:line. Max 15 findings.

## Agent 4 — Security
Check for: exposed secrets or API keys in code, SQL injection risks, missing input validation, insecure dependencies, open redirects, weak token generation. Return findings as [HIGH|MEDIUM|LOW] description — file:line. Max 15 findings.

## Agent 5 — Test coverage
Find: source files with no corresponding test file, tests that don't assert anything meaningful, missing edge cases (null inputs, empty arrays, error states). Return findings as [HIGH|MEDIUM|LOW] description — file:line. Max 15 findings.

## Agent 6 — Dependencies (needs Bash)
Run npm audit / pip-audit / cargo audit if applicable. Flag outdated packages with known vulnerabilities. Check for unused dependencies. Return findings as [HIGH|MEDIUM|LOW] description. Max 15 findings.

## Final report
After all agents complete, produce a single consolidated report:
- Summary scorecard (one line per dimension)
- All HIGH findings first, then MEDIUM, then LOW
- Total count per severity

IMPORTANT: Do NOT modify any files. Audit and report only.