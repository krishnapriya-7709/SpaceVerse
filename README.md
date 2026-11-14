# SPACEVERSE: GALAXY-X

An interactive 3D space mission engineering game and satellite simulation set inside the **GALAXY-X Space Research Facility**. Build satellites, assemble rockets, manage orbital solar and battery power, and command sounding missions across a 12-level campaign.

---

## Features

- **3D Research Facility Exploration**
  Walk around Ground Station (`GSC`), Scientific Research Lab (`SRL`), Spacecraft Assembly Hangar (`SAH`), Launch Control Complex (`LCC`), Mission Control Center (`MCC`), and Launch Pad `39X` using WASD controls or fast-travel radar.
- **Cadet Training Orientation**
  6 interactive hands-on station tasks introducing telemetry, satellite subsystems, payloads, and mission budgeting.
- **Interactive Story Mode**
  Step-by-step `"Next → Next"` story transmissions with visual hardware cards before every campaign level.
- **12-Level Space Campaign**
  - **Level 1 – Satellite Assembly Lab:** Inspect and drag 9 subsystems onto a 3D spacecraft bus to earn the *Satellite Builder* badge.
  - **Level 2 – Rocket Assembly & Launch (4 Stages):** Build a 10-part two-stage rocket, position it on Pad `39X`, seal the Level 1 satellite inside the fairing, and launch into orbit.
  - **Level 3 – Orbit & Power Management:** Size solar wings (`50–250 W`), select a battery (`300 / 500 / 800 Wh`), place the satellite in Earth's orbit, and survive a full `360°` rotation through sunlight and Earth's shadow.
  - **Levels 4–12 – Atmospheric & Trans-Lunar Missions:** Balance sensor mass, motor impulse, and Grant Credits from `70 km` up to `300+ km`.
- **Progression & Rewards**
  Persistent player callsigns, Grant Credits (`₡`), Star Credits (`★ SC`), mission scores, and earned aerospace badges.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Three.js, Lucide React, Web Audio API
- **Backend:** Node.js, Express (`server.ts`)

---

## Getting Started

### 1. Install dependencies
```bash
npm install
