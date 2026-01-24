import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { AnimatedV8Engine } from "./AnimatedV8Engine";
import { DimensionalReport } from "./DimensionalReport";
import { FinalAuditPanel } from "./FinalAuditPanel";
import { SceneMaterialOverride } from "./SceneMaterialOverride";
import { useEngine } from "@/lib/stores/useEngine";

interface CylinderTelemetry {
  cylinderNumber: number;
  rodAngleDeg: number;
  pistonPositionInches: number;
  phase: 'compression' | 'power' | 'exhaust' | 'intake';
}

interface EngineViewerProps {
  debugMode?: boolean;
  onTelemetryUpdate?: (cylinders: CylinderTelemetry[], crankAngleDeg: number) => void;
}

export function EngineViewer({ debugMode = false, onTelemetryUpdate }: EngineViewerProps) {
  const cadMode = useEngine((state) => state.cadMode);
  
  return (
    <>
      <SceneMaterialOverride />
      
      {cadMode ? (
        <ambientLight intensity={1.0} />
      ) : (
        <>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[512, 512]}
            shadow-camera-far={20}
            shadow-camera-left={-5}
            shadow-camera-right={5}
            shadow-camera-top={5}
            shadow-camera-bottom={-5}
          />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          <pointLight position={[0, 5, 0]} intensity={0.5} />
        </>
      )}

      <AnimatedV8Engine debugMode={debugMode} onTelemetryUpdate={onTelemetryUpdate} />
      
      {debugMode && <DimensionalReport />}
      {debugMode && <FinalAuditPanel />}

      {!cadMode && (
        <>
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.5}
            scale={20}
            blur={2}
            far={5}
          />
          <Environment preset="city" background={false} />
        </>
      )}

      <OrbitControls
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={12}
        minPolarAngle={0}
        maxPolarAngle={Math.PI * 0.85}
      />
    </>
  );
}
