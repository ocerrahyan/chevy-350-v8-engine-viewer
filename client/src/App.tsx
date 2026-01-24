import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useCallback } from "react";
import "@fontsource/inter";
import { EngineViewer } from "./components/game/EngineViewer";
import { ThrottleControl } from "./components/game/ThrottleControl";
import { RPMGauge } from "./components/game/RPMGauge";
import { ControlsGuide } from "./components/game/ControlsGuide";
import { DebugToggle } from "./components/game/DebugToggle";
import { XRayToggle } from "./components/game/XRayToggle";
import { CadModeToggle } from "./components/game/CadModeToggle";
import { BlockVisibilityToggle } from "./components/game/BlockVisibilityToggle";
import { LoadControl } from "./components/game/LoadControl";
import { PhysicsTelemetry } from "./components/game/PhysicsTelemetry";
import { TelemetryOverlay } from "./components/game/AnimatedV8Engine";
import { ViewPresetsUI, ViewPresetsController } from "./components/game/ViewPresets";
import { useEngine } from "./lib/stores/useEngine";

interface CylinderTelemetry {
  cylinderNumber: number;
  rodAngleDeg: number;
  pistonPositionInches: number;
  phase: 'compression' | 'power' | 'exhaust' | 'intake';
}

function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Loading Engine...</p>
      </div>
    </div>
  );
}

function App() {
  const [debugMode, setDebugMode] = useState(false);
  const [activeView, setActiveView] = useState<string | null>(null);
  const cadMode = useEngine((state) => state.cadMode);
  const [telemetryData, setTelemetryData] = useState<{
    cylinders: CylinderTelemetry[];
    crankAngleDeg: number;
  }>({
    cylinders: Array.from({ length: 8 }, (_, i) => ({
      cylinderNumber: i + 1,
      rodAngleDeg: 0,
      pistonPositionInches: 0,
      phase: 'compression' as const,
    })),
    crankAngleDeg: 0,
  });

  const handleTelemetryUpdate = useCallback((cylinders: CylinderTelemetry[], crankAngleDeg: number) => {
    setTelemetryData({ cylinders, crankAngleDeg });
  }, []);
  
  return (
    <div className="w-screen h-screen relative overflow-hidden bg-gray-900">
      <div className="absolute top-2 sm:top-6 left-1/2 -translate-x-1/2 z-10">
        <h1 className="text-white text-sm sm:text-xl md:text-2xl font-bold tracking-wider uppercase bg-black/70 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 rounded-xl border border-white/10">
          Chevy 350 Small Block V8
        </h1>
      </div>

      <Canvas
        shadows={cadMode ? false : "soft"}
        camera={{
          position: [5, 3, 5],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          precision: cadMode ? "lowp" : "mediump",
        }}
        dpr={cadMode ? 1 : [0.75, 1]}
      >
        <color attach="background" args={[cadMode ? "#ffffff" : "#1a1a2e"]} />
        {!cadMode && <fog attach="fog" args={["#1a1a2e", 15, 30]} />}
        
        <Suspense fallback={null}>
          <EngineViewer debugMode={debugMode} onTelemetryUpdate={handleTelemetryUpdate} />
          <ViewPresetsController activeView={activeView} onViewChange={setActiveView} />
        </Suspense>
      </Canvas>

      <DebugToggle debugMode={debugMode} onToggle={() => setDebugMode(!debugMode)} />
      <XRayToggle />
      <CadModeToggle />
      <BlockVisibilityToggle />
      <ViewPresetsUI onSelectView={setActiveView} />
      <ThrottleControl />
      <LoadControl />
      <RPMGauge />
      <PhysicsTelemetry />
      <ControlsGuide />
      
      {debugMode && (
        <TelemetryOverlay 
          cylinders={telemetryData.cylinders} 
          crankAngleDeg={telemetryData.crankAngleDeg} 
        />
      )}
    </div>
  );
}

export default App;
