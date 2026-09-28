# Security policy

CommerceSuite is a portfolio project. The live demo holds only seeded, fictional data and is reset on every deploy, but security reports are still welcome.

## Reporting a vulnerability

Please use GitHub's private reporting: **Security → Report a vulnerability** on this repository. Do not open a public issue for anything exploitable.

Include the affected endpoint or file, steps to reproduce, and the impact you expect. You should get a reply within a week.

## Scope

In scope:

- The API in `backend/` (authentication, role checks, order and stock rules, input validation)
- The React app in `frontend/`
- The deployed demo at https://commercesuite-demo.vercel.app and its API on Render

Out of scope:

- Denial of service or load testing against the free-tier demo hosts
- The published demo credentials in the README (they are public on purpose)
- Findings that need a compromised browser or device

Please do not run automated scanners against the live demo; run the app locally instead (see the README).
