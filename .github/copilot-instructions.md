# MyPorfolio Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-30

## Active Technologies
- TypeScript 6.x (strict mode) + Angular 17+ (standalone components), Angular Material 17+, Angular Reactive Forms, Angular HTTP Client, RxJS 7.x (007-contact-email-ui)
- N/A (frontend only — all state is sourced from the `006` backend APIs over HTTP) (007-contact-email-ui)
- YAML (GitHub Actions workflow syntax) + Node.js 20 LTS (build/test runner) + `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`; Render deploy hook (HTTP POST); Angular CLI (`ng build`) (008-github-cicd-workflow)
- N/A — no data storage; GitHub Pages hosts static assets, Render hosts the backend (008-github-cicd-workflow)

- TypeScript 6.x (strict mode) + Express.js 5.x, Mongoose 9.x, nodemailer 6.x (new), handlebars 4.x (new), html-to-text 9.x (new) (006-contact-email-admin-inbox)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 6.x (strict mode): Follow standard conventions

## Recent Changes
- 008-github-cicd-workflow: Added YAML (GitHub Actions workflow syntax) + Node.js 20 LTS (build/test runner) + `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`; Render deploy hook (HTTP POST); Angular CLI (`ng build`)
- 007-contact-email-ui: Added TypeScript 6.x (strict mode) + Angular 17+ (standalone components), Angular Material 17+, Angular Reactive Forms, Angular HTTP Client, RxJS 7.x

- 006-contact-email-admin-inbox: Added TypeScript 6.x (strict mode) + Express.js 5.x, Mongoose 9.x, nodemailer 6.x (new), handlebars 4.x (new), html-to-text 9.x (new)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
