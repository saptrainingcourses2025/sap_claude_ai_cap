# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SAP CAP (Cloud Application Programming Model) project, built on `@sap/cds` v9 with an Express server.

- `db/` — domain models (CDS schema, e.g. `db/schema.cds`) — currently empty scaffold
- `srv/` — service definitions (CDS service files + handlers) — currently empty scaffold
- `app/` — UI frontend content — currently empty scaffold

This is a freshly scaffolded project; none of the above folders have content yet.

## Commands

- `npm install` — install dependencies
- `npm start` (or `cds-serve`) — run the server
- `cds watch` — run in dev mode with live reload (preferred during active development)

## Dev environment

- Dev/test persistence is SQLite via `@cap-js/sqlite` (devDependency). No separate DB setup needed locally.
- Linting uses the CAP-recommended ESLint config (`@sap/cds/eslint.config.mjs`) — don't introduce custom rules that conflict with it.
- No git repository has been initialized yet.
