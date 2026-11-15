# ORBITX

Design. Launch. Explore.

Educational space mission design and simulation game for the 2026 NASA Space Apps Challenge. Players choose a destination and science objectives, configure a spacecraft, and fly a simulation whose propellant, power, heat, communications, and score come from those choices.

Tagline: Your decisions. Your spacecraft. Your mission.

## Run it

```bash
npm install
npm run dev
```

The game is at [http://127.0.0.1:5173](http://127.0.0.1:5173). The API is at [http://127.0.0.1:4000](http://127.0.0.1:4000).

```bash
npm test
npm run build
```

## Saving

Missions are written to this browser immediately. If `MONGODB_URI` is set and MongoDB accepts the connection, the API also stores them. Copy `server/.env.example` to `server/.env` to point at a database. With no database, the API stays up in demo mode and the browser save still works. Refreshing the page does not drop the mission.

## What is real in the model

- Mass, cost, power, propellant, link index, and the score share one calculation.
- A launcher that cannot lift the stack cannot launch.
- Electric propulsion that lacks cruise power cannot launch.
- An objective with no supporting instrument cannot launch.
- A fuel leak can exhaust an expert propellant reserve and fail orbital insertion.
- Weak communications can fail the data return.
- Thin thermal protection raises temperature and costs spacecraft health.
- Anomaly choices change the resources used by the rest of the flight.

The formulas and the limits of the model are in the Methodology page. ORBIT-X launchers are fictional. Telemetry is simulated educational data, not a live spacecraft.

## Layout

- `client/` React 18, Vite, TypeScript, Tailwind, React Three Fiber, Recharts, Zustand
- `server/` Express and Mongoose
- `client/src/engine/` mass, power, propellant, simulation, and scoring
- `client/src/data/` destinations, hardware, instruments, and anomalies
