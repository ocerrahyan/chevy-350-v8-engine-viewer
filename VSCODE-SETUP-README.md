# Chevy 350 Small Block V8 Engine Viewer
## VS Code Setup Guide

This is an interactive 3D Chevy 350 Small Block V8 engine visualization with physics-based thermodynamic simulation.

## Prerequisites

1. **Node.js** (v18 or higher) - https://nodejs.org/
2. **VS Code** - https://code.visualstudio.com/
3. **PostgreSQL** (optional, for database features) - https://www.postgresql.org/

## Quick Start

1. **Extract the zip file** to a folder on your computer

2. **Open in VS Code**:
   ```bash
   cd chevy-350-vscode-project
   code .
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**: Navigate to `http://localhost:5000`

## Project Structure

```
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite bundler config
├── tailwind.config.ts        # Tailwind CSS config
├── client/
│   ├── src/
│   │   ├── App.tsx           # Main React app
│   │   ├── components/
│   │   │   ├── game/         # 3D engine components
│   │   │   │   ├── AnimatedV8Engine.tsx    # 4000+ lines - all engine geometry
│   │   │   │   ├── EngineViewer.tsx        # Scene setup
│   │   │   │   ├── ThrottleControl.tsx     # Throttle UI
│   │   │   │   ├── RPMGauge.tsx            # Tachometer
│   │   │   │   ├── IgnitionSwitch.tsx      # Key ignition
│   │   │   │   └── PhysicsTelemetry.tsx    # Real-time data
│   │   │   └── ui/           # shadcn/ui components
│   │   └── lib/
│   │       ├── physics/      # Thermodynamic simulation
│   │       │   ├── EnginePhysics.ts        # Main physics engine
│   │       │   ├── StarterMotor.ts         # Starter simulation
│   │       │   ├── Carburetor.ts           # Rochester Quadrajet
│   │       │   └── RingSealing.ts          # Piston ring physics
│   │       ├── stores/       # Zustand state management
│   │       │   ├── useEngine.tsx           # Simple mode state
│   │       │   └── usePhysicsEngine.tsx    # Physics mode state
│   │       └── specs/
│   │           └── SBC350Specifications.ts # All Chevy 350 dimensions
│   └── public/
│       └── models/v8-engine.glb            # 3D model file
├── server/
│   ├── index.ts              # Express server entry
│   └── routes.ts             # API routes
└── shared/
    └── schema.ts             # Database schema
```

## Key Features

### Engine Specifications (Authentic Chevy 350)
- **Bore**: 4.000" (0.344 units)
- **Stroke**: 3.480" (0.299 units)
- **Connecting Rod Length**: 5.700"
- **Compression Ratio**: 9.5:1
- **V-Angle**: 90° (45° each bank)

### Physics Simulation
- **Septic (7th-order) Cam Profile**: `P(t) = 64·t³·(1−t)³·(1 + s·(t−0.5))` with s=0.35
- **Wiebe Combustion Model** with heat release curves
- **HEI Ignition Timing**: 8° initial, 24° mechanical advance, 12° vacuum advance
- **Valve Float Simulation**: Progressive lift reduction above 6200 RPM
- **Combustion Gating**: Cylinders only fire when valves closed

### Controls
- **W/S or Arrow Up/Down**: Adjust throttle
- **Space/Enter**: Toggle engine
- **D**: Toggle debug visualization mode
- **Mouse drag**: Rotate camera view

## Recommended VS Code Extensions

- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **TypeScript Vue Plugin (Volar)** - for better TS support
- **Prettier** - Code formatter
- **ESLint** - Linting

## Environment Variables (Optional)

Create a `.env` file for database connection:
```
DATABASE_URL=postgresql://user:password@localhost:5432/engine_db
SESSION_SECRET=your-secret-key
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Technical Notes

### Why Septic (7th-order) Polynomial for Cam Profile?
A 5th-order polynomial cannot satisfy all boundary conditions:
- Zero lift at t=0 and t=1
- Zero velocity at t=0 and t=1
- Zero acceleration at t=0 and t=1
- Peak lift at t≈0.5

The minimum viable solution is a 7th-order (septic) polynomial.

### Cam Specifications
- **Lobe Lift**: 0.350"
- **Duration**: 270° @ 0.050"
- **Lobe Separation Angle**: 110°
- **Rocker Ratio**: 1.5:1
- **Gross Valve Lift**: 0.525"

## License

This project is for educational purposes demonstrating engineering simulation with Three.js and React.
