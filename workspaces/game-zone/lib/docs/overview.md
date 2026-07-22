# game-zone — Project Overview

## What this is

<!-- Describe the product and its purpose -->

## Platform

- **Target OS:** iOS / Android
- **Primary device:** iPhone 16 Pro (393×852)
- **Form factor:** Phone-first

## Key flows

| Flow            | Screens                                      | Purpose                  |
| --------------- | -------------------------------------------- | ------------------------ |
| onboarding-flow | welcome-screen → setup-screen → ready-screen | First-run onboarding     |
| home-flow       | home-screen → detail-screen                  | Browse and inspect items |

## Mock data

Seed data lives in `lib/data/db.ts`. Named exports (`user`, `items`) are loaded into the platform `db` object.
Simulator controls for mutating data at runtime are in `lib/data/simulator.tsx`.

## Design system

Tokens live in `lib/design-system/tokens.css`. Shared UI components in `lib/components/ui/`.

## Scaffold commands

```
flowkit create:screen --flow:<flow> --name:<screen>   # add a screen
flowkit create:flow --name:<flow>                     # add a flow
flowkit create:component --name:<Name> --path:lib/components/ui
flowkit add:step --flowplan:<id> --screen:<screenId> --action:"description"
```
