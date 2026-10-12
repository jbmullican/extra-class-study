# Security Policy

## Supported versions
Only the latest version deployed to GitHub Pages from `main` is supported.

## Reporting a vulnerability
Please **do not open a public issue**. Use GitHub's private vulnerability reporting:
**Security → Report a vulnerability** on this repository
(<https://github.com/jbmullican/extra-class-study/security/advisories/new>).

You can expect an acknowledgement within 7 days. This app is fully static: it has no
backend, collects no data, and stores progress only in your browser's localStorage.

## Hardening in place
- Content-Security-Policy restricting scripts to same origin; no third-party scripts or runtime dependencies
- CodeQL (JavaScript + GitHub Actions), Dependabot alerts and security updates
- Secret scanning with push protection
- Protected `main` branch (PRs and passing checks required, no force pushes or deletion)
