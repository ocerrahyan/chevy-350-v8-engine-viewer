import { useRef, useMemo, useState, useEffect, createContext, useContext, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useEngine } from "@/lib/stores/useEngine";
import { usePhysicsEngine, CylinderState as PhysicsCylinderState } from "@/lib/stores/usePhysicsEngine";

// Import centralized SBC 350 specifications
import {
  SCALE_FACTOR,
  toUnits,
  BLOCK,
  BLOCK_SCALED,
  CRANKSHAFT,
  CRANKSHAFT_SCALED,
  MAIN_BEARINGS,
  ROD_BEARINGS,
  CONNECTING_ROD,
  CONNECTING_ROD_SCALED,
  PISTON,
  PISTON_SCALED,
  PISTON_RINGS,
  PISTON_RINGS_SCALED,
  CAMSHAFT,
  CAMSHAFT_SCALED,
  CAM_BEARINGS,
  LIFTERS,
  LIFTERS_SCALED,
  TIMING_CHAIN,
  TIMING_CHAIN_SCALED,
  PUSHRODS,
  PUSHRODS_SCALED,
  ROCKER_ARMS,
  ROCKER_ARMS_SCALED,
  VALVES,
  VALVES_SCALED,
  VALVE_SPRINGS,
  VALVE_SPRINGS_SCALED,
  VALVE_GUIDES,
  VALVE_GUIDES_SCALED,
  CYLINDER_HEADS,
  CYLINDER_HEADS_SCALED,
  INTAKE_MANIFOLD,
  INTAKE_MANIFOLD_SCALED,
  CARBURETOR,
  CARBURETOR_SCALED,
  DISTRIBUTOR,
  DISTRIBUTOR_SCALED,
  MATERIAL_COLORS,
} from "@/lib/specs/SBC350Specifications";

// ============================================================================
// CHEVY 350 SMALL BLOCK V8 - DERIVED CONSTANTS FROM SPECS
// All values come from SBC350Specifications.ts for accuracy
// ============================================================================

// Core dimensions (using centralized specs)
const BORE = BLOCK_SCALED.BORE_DIAMETER;
const STROKE = CRANKSHAFT_SCALED.STROKE;
const CRANK_RADIUS = CRANKSHAFT_SCALED.CRANK_THROW;
const ROD_LENGTH = CONNECTING_ROD_SCALED.LENGTH;
const MAIN_JOURNAL_DIA = CRANKSHAFT_SCALED.MAIN_JOURNAL_DIAMETER;
const ROD_JOURNAL_DIA = CRANKSHAFT_SCALED.ROD_JOURNAL_DIAMETER;
const WRIST_PIN_DIA = PISTON_SCALED.WRIST_PIN_DIAMETER;

// Block dimensions
const CYLINDER_SPACING = BLOCK_SCALED.BORE_SPACING;
const DECK_HEIGHT = BLOCK_SCALED.DECK_HEIGHT;
const BANK_ANGLE = BLOCK_SCALED.BANK_ANGLE_RAD;
const BANK_OFFSET = BLOCK_SCALED.BANK_OFFSET; // Left bank forward offset (SBC design)

// Valvetrain dimensions
const INTAKE_VALVE_DIA = VALVES_SCALED.INTAKE_HEAD_DIAMETER;
const EXHAUST_VALVE_DIA = VALVES_SCALED.EXHAUST_HEAD_DIAMETER;
const VALVE_STEM_DIA = VALVES_SCALED.STEM_DIAMETER;
const VALVE_STEM_LENGTH = VALVES_SCALED.STEM_LENGTH;
const PUSHROD_LENGTH = PUSHRODS_SCALED.LENGTH;
const PUSHROD_DIA = PUSHRODS_SCALED.DIAMETER;
const ROCKER_RATIO = ROCKER_ARMS.RATIO;
const CAM_LOBE_LIFT = CAMSHAFT_SCALED.LOBE_LIFT_INTAKE;
const VALVE_LIFT = VALVES_SCALED.INTAKE_LIFT;
const MAX_VALVE_LIFT = VALVES_SCALED.MAX_LIFT;
const LIFTER_DIA = LIFTERS_SCALED.BODY_DIAMETER;
const CAM_BASE_CIRCLE = CAMSHAFT_SCALED.BASE_CIRCLE_DIAMETER;

// Timing chain/gear dimensions (corrected to authentic specs)
const CRANK_SPROCKET_TEETH = TIMING_CHAIN.CRANK_GEAR_TEETH; // 24 teeth
const CAM_SPROCKET_TEETH = TIMING_CHAIN.CAM_GEAR_TEETH;     // 42 teeth (2:1 ratio)
const TIMING_CHAIN_CENTERS = TIMING_CHAIN_SCALED.CENTER_DISTANCE;

// Block dimensions derived from cylinder layout
const FIRST_CYLINDER_Z = -1.5 * CYLINDER_SPACING;
const LAST_CYLINDER_Z = 1.5 * CYLINDER_SPACING;
const BLOCK_LENGTH = 4 * CYLINDER_SPACING + 0.15;
const BLOCK_WIDTH = toUnits(8);
const BLOCK_HEIGHT = toUnits(10);

// Main bearing positions (5 mains, between/outside cylinder pairs)
const MAIN_BEARING_POSITIONS = [
  FIRST_CYLINDER_Z - CYLINDER_SPACING * 0.5,
  FIRST_CYLINDER_Z + CYLINDER_SPACING * 0.5,
  0,
  LAST_CYLINDER_Z - CYLINDER_SPACING * 0.5,
  LAST_CYLINDER_Z + CYLINDER_SPACING * 0.5,
];

// Crankpin positions (4 throws, aligned with cylinder pairs)
const CRANKPIN_Z_POSITIONS = [
  FIRST_CYLINDER_Z,
  FIRST_CYLINDER_Z + CYLINDER_SPACING,
  LAST_CYLINDER_Z - CYLINDER_SPACING,
  LAST_CYLINDER_Z,
];

// Piston dimensions (from centralized specs)
const PISTON_HEIGHT = PISTON_SCALED.OVERALL_HEIGHT;
const PISTON_COMPRESSION_HEIGHT = PISTON_SCALED.COMPRESSION_HEIGHT;
const RING_LAND_WIDTH = PISTON_RINGS_SCALED.TOP_RING_WIDTH;

// Crankshaft position
const CRANKSHAFT_Y = 0;

// Chevy 350 firing order: 1-8-4-3-6-5-7-2
// Cylinder numbering: Right bank (front to back): 1,3,5,7 | Left bank: 2,4,6,8
// Crank throw pairings (cylinders sharing same throw reach TDC together):
// - Throw 1 at 0°: Cyl 1 & 6
// - Throw 2 at 90°: Cyl 8 & 5
// - Throw 3 at 180°: Cyl 4 & 7
// - Throw 4 at 270°: Cyl 3 & 2
// Phase offsets for cross-plane crank (derived from throw angles)
const V8_PHASE_OFFSETS_RIGHT_BANK = [0, (3 * Math.PI) / 2, Math.PI / 2, Math.PI]; // Cyl 1(0°),3(270°),5(90°),7(180°)
const V8_PHASE_OFFSETS_LEFT_BANK = [(3 * Math.PI) / 2, Math.PI, 0, Math.PI / 2]; // Cyl 2(270°),4(180°),6(0°),8(90°) - paired with 1&6, 8&5, 4&7, 3&2

// Debug context (internal use only)
const DebugContext = createContext<{ debugMode: boolean }>({ debugMode: false });

// CAD wireframe mode context - enables wireframe rendering for all meshes
const CadModeContext = createContext<boolean>(false);

// Helper hook for CAD mode
function useCadMode() {
  return useContext(CadModeContext);
}

// CAD wireframe material component - renders black wireframe when CAD mode is active
function CADMaterial({ children }: { children: React.ReactNode }) {
  const cadMode = useCadMode();
  if (cadMode) {
    return <meshBasicMaterial color="#000000" wireframe />;
  }
  return <>{children}</>;
}

// Helper to get shadow props based on CAD mode
function useCadShadowProps() {
  const cadMode = useCadMode();
  return cadMode ? { castShadow: false, receiveShadow: false } : { castShadow: true, receiveShadow: true };
}

// Real-time telemetry store for mechanical validation
interface CylinderTelemetry {
  cylinderNumber: number;
  rodAngleDeg: number;
  pistonPositionInches: number;
  phase: 'compression' | 'power' | 'exhaust' | 'intake';
}

interface TelemetryStore {
  cylinders: CylinderTelemetry[];
  crankAngleDeg: number;
  setCylinderData: (cylinderNumber: number, data: Omit<CylinderTelemetry, 'cylinderNumber'>) => void;
  setCrankAngle: (angle: number) => void;
}

const TelemetryContext = createContext<TelemetryStore | null>(null);

function useTelemetryStore(): TelemetryStore {
  const [cylinders, setCylinders] = useState<CylinderTelemetry[]>(
    Array.from({ length: 8 }, (_, i) => ({
      cylinderNumber: i + 1,
      rodAngleDeg: 0,
      pistonPositionInches: 0,
      phase: 'compression' as const,
    }))
  );
  const [crankAngleDeg, setCrankAngleDeg] = useState(0);
  
  const setCylinderData = (cylinderNumber: number, data: Omit<CylinderTelemetry, 'cylinderNumber'>) => {
    setCylinders(prev => prev.map(c => 
      c.cylinderNumber === cylinderNumber ? { ...c, ...data } : c
    ));
  };
  
  const setCrankAngle = (angle: number) => {
    setCrankAngleDeg((angle * 180 / Math.PI) % 720);
  };
  
  return { cylinders, crankAngleDeg, setCylinderData, setCrankAngle };
}

// Telemetry overlay component for debug mode
export function TelemetryOverlay({ cylinders, crankAngleDeg }: { cylinders: CylinderTelemetry[]; crankAngleDeg: number }) {
  const leftBank = cylinders.filter(c => [1, 3, 5, 7].includes(c.cylinderNumber));
  const rightBank = cylinders.filter(c => [2, 4, 6, 8].includes(c.cylinderNumber));
  
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-xs font-mono text-white border border-cyan-500/40 max-w-[400px]">
      <div className="font-bold mb-2 text-cyan-400 flex justify-between">
        <span>Live Mechanical Telemetry</span>
        <span className="text-yellow-400">Crank: {crankAngleDeg.toFixed(0)}°</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-gray-400 mb-1">Right Bank (1-3-5-7)</div>
          <div className="space-y-0.5">
            {leftBank.map(c => (
              <div key={c.cylinderNumber} className="flex justify-between text-[10px]">
                <span className="text-gray-300">Cyl {c.cylinderNumber}:</span>
                <span className={`${c.phase === 'power' ? 'text-orange-400' : c.phase === 'compression' ? 'text-yellow-300' : 'text-gray-400'}`}>
                  Rod {c.rodAngleDeg.toFixed(1)}° | {c.pistonPositionInches.toFixed(2)}"
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Left Bank (2-4-6-8)</div>
          <div className="space-y-0.5">
            {rightBank.map(c => (
              <div key={c.cylinderNumber} className="flex justify-between text-[10px]">
                <span className="text-gray-300">Cyl {c.cylinderNumber}:</span>
                <span className={`${c.phase === 'power' ? 'text-orange-400' : c.phase === 'compression' ? 'text-yellow-300' : 'text-gray-400'}`}>
                  Rod {c.rodAngleDeg.toFixed(1)}° | {c.pistonPositionInches.toFixed(2)}"
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-white/10 text-[9px] text-gray-500">
        Rod angle = deviation from bore axis | Position = distance from TDC
      </div>
    </div>
  );
}

// ============================================================================
// GEOMETRY VALIDATION DEBUG PANEL
// Shows SBC 350 authentic dimensions when debug mode (D key) is active
// ============================================================================
export function GeometryDebugPanel() {
  const geometrySpecs = [
    { label: "Bore", value: `${BLOCK.BORE_DIAMETER.toFixed(3)}"` },
    { label: "Stroke", value: `${CRANKSHAFT.STROKE.toFixed(3)}"` },
    { label: "Bore Spacing", value: `${BLOCK.BORE_SPACING.toFixed(3)}"` },
    { label: "Deck Height", value: `${BLOCK.DECK_HEIGHT.toFixed(3)}"` },
    { label: "Cam-to-Crank", value: `${CAMSHAFT.HEIGHT_FROM_CRANK.toFixed(3)}"` },
    { label: "Rod Length", value: `${CONNECTING_ROD.LENGTH.toFixed(3)}"` },
    { label: "Main Journal", value: `${CRANKSHAFT.MAIN_JOURNAL_DIAMETER.toFixed(2)}"` },
    { label: "Rod Journal", value: `${CRANKSHAFT.ROD_JOURNAL_DIAMETER.toFixed(2)}"` },
    { label: "Lifter OD", value: `${LIFTERS.BODY_DIAMETER.toFixed(3)}"` },
  ];

  return (
    <Html
      position={[-0.5, 0.6, 0]}
      center={false}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div className="bg-black/85 backdrop-blur-sm rounded-lg p-3 text-xs font-mono text-white border border-green-500/50 min-w-[180px]">
        <div className="font-bold mb-2 text-green-400 border-b border-green-500/30 pb-1">
          SBC 350 Geometry
        </div>
        <div className="space-y-1">
          {geometrySpecs.map((spec, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="text-gray-400">{spec.label}:</span>
              <span className="text-green-300">{spec.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-green-500/20 text-[9px] text-gray-500">
          Press D to toggle debug mode
        </div>
      </div>
    </Html>
  );
}

// ============================================================================
// STROKE VERIFICATION DEBUG PANEL
// Shows calculated stroke travel and deck clearance data
// ============================================================================
export function StrokeVerificationPanel() {
  // Calculate key dimensions
  const crankRadius = CRANKSHAFT.CRANK_THROW; // 1.74"
  const rodLength = CONNECTING_ROD.LENGTH; // 5.7"
  const compressionHeight = PISTON.COMPRESSION_HEIGHT; // 1.55"
  const deckHeight = BLOCK.DECK_HEIGHT; // 9.025"
  
  // TDC: wrist pin at max distance from crank
  const tdcWristPinDist = crankRadius + rodLength; // 7.44"
  // Crown at TDC = wrist pin dist + compression height
  const tdcCrownDist = tdcWristPinDist + compressionHeight; // 8.99"
  
  // BDC: wrist pin at min distance from crank  
  const bdcWristPinDist = rodLength - crankRadius; // 3.96"
  // Crown at BDC = wrist pin dist + compression height
  const bdcCrownDist = bdcWristPinDist + compressionHeight; // 5.51"
  
  // Stroke = difference in crown positions = 2 * crank radius
  const calculatedStroke = tdcCrownDist - bdcCrownDist; // 3.48"
  
  // Deck clearance = deck height - crown distance at TDC
  const calculatedDeckClearance = deckHeight - tdcCrownDist;
  
  // Max rod angle = asin(crank_radius / rod_length)
  const maxRodAngle = Math.asin(crankRadius / rodLength) * (180 / Math.PI);
  
  const verificationData = [
    { label: "Stroke Spec", value: `${CRANKSHAFT.STROKE.toFixed(3)}"`, status: true },
    { label: "Calculated Stroke", value: `${calculatedStroke.toFixed(3)}"`, status: Math.abs(calculatedStroke - CRANKSHAFT.STROKE) < 0.001 },
    { label: "TDC Crown→Crank", value: `${tdcCrownDist.toFixed(3)}"`, status: true },
    { label: "BDC Crown→Crank", value: `${bdcCrownDist.toFixed(3)}"`, status: true },
    { label: "Deck Height", value: `${deckHeight.toFixed(3)}"`, status: true },
    { label: "Deck Clearance", value: `${(calculatedDeckClearance * 1000).toFixed(1)} thou`, status: calculatedDeckClearance > 0.015 && calculatedDeckClearance < 0.050 },
    { label: "Max Rod Angle", value: `${maxRodAngle.toFixed(1)}°`, status: Math.abs(maxRodAngle - 17.77) < 0.5 },
    { label: "Compression Ht", value: `${compressionHeight.toFixed(3)}"`, status: true },
  ];

  return (
    <Html
      position={[0.5, 0.6, 0]}
      center={false}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div className="bg-black/85 backdrop-blur-sm rounded-lg p-3 text-xs font-mono text-white border border-yellow-500/50 min-w-[200px]">
        <div className="font-bold mb-2 text-yellow-400 border-b border-yellow-500/30 pb-1">
          Stroke Verification
        </div>
        <div className="space-y-1">
          {verificationData.map((item, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="text-gray-400">{item.label}:</span>
              <span className={item.status ? 'text-green-300' : 'text-red-400'}>
                {item.value} {item.status ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-yellow-500/20 text-[9px] text-gray-500">
          Green = matches spec | Red = needs attention
        </div>
      </div>
    </Html>
  );
}

// ============================================================================
// DEBUG VISUALIZATION HELPERS
// ============================================================================
function DebugSphere({ position, color, size = 0.015 }: { position: [number, number, number]; color: string; size?: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function DebugLine({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) {
  const lineRef = useRef<THREE.Line>(null);
  
  const lineGeometry = useMemo(() => {
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({ color });
  }, [color]);

  return <primitive object={new THREE.Line(lineGeometry, lineMaterial)} />;
}

// ============================================================================
// DETAILED PISTON ASSEMBLY
// 4032-T6 Hypereutectic Aluminum - Chevy 350 specs
// Based on reference image: rings clustered near crown, visible wrist pin bore,
// skirt extends below pin bosses
// Piston-to-wall clearance: 0.0015" cold, closes to 0.0008" hot
// Ring gaps: Top 0.020", Second 0.022", Oil 0.025" (per 4" bore = 0.005"/inch)
// ============================================================================
function DetailedPiston({ debugMode, bankSide = 1 }: { debugMode: boolean; bankSide?: 1 | -1 }) {
  const pistonRadius = BORE / 2 - 0.003; // 0.0015" wall clearance per side
  const ringGap = 0.020 * 0.086; // 0.020" gap in model units
  
  // SBC 350 Authentic Piston Geometry:
  // - Compression height = 1.550" (pin center to crown) from PISTON.COMPRESSION_HEIGHT
  // - Overall height = 2.750" from PISTON.OVERALL_HEIGHT
  // - Wrist pin is COMPRESSION_HEIGHT below crown
  // In local piston space, crown is at +PISTON_HEIGHT/2, so:
  // wristPinY = crown_position - compression_height = (PISTON_HEIGHT/2) - PISTON_COMPRESSION_HEIGHT
  const wristPinY = (PISTON_HEIGHT / 2) - PISTON_COMPRESSION_HEIGHT;
  
  // Visual proportions (ring pack, pin area, skirt) remain for geometry
  const crownHeight = PISTON_HEIGHT * 0.25;
  const pinAreaHeight = PISTON_HEIGHT * 0.35;
  const skirtHeight = PISTON_HEIGHT * 0.40;
  
  return (
    <group>
      {/* === CROWN SECTION (top 25%) - solid with ring grooves === */}
      <mesh position={[0, PISTON_HEIGHT / 2 - crownHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[pistonRadius, pistonRadius, crownHeight, 32]} />
        <meshStandardMaterial color="#b8b8b8" metalness={0.95} roughness={0.08} />
      </mesh>
      
      {/* Piston crown top surface (machined flat) */}
      <mesh position={[0, PISTON_HEIGHT / 2 - 0.002, 0]} castShadow>
        <cylinderGeometry args={[pistonRadius - 0.003, pistonRadius - 0.003, 0.004, 32]} />
        <meshStandardMaterial color="#a8a8a8" metalness={0.92} roughness={0.12} />
      </mesh>
      
      {/* Valve reliefs - INTAKE side (larger, toward intake valves) */}
      <mesh position={[bankSide * pistonRadius * 0.35, PISTON_HEIGHT / 2 - 0.004, pistonRadius * 0.15]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.010, 16]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* EXHAUST valve relief (smaller) */}
      <mesh position={[-bankSide * pistonRadius * 0.35, PISTON_HEIGHT / 2 - 0.004, -pistonRadius * 0.15]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.010, 16]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* === RING PACK - clustered just below crown (top 12-18% of height) === */}
      {/* TOP COMPRESSION RING - Chrome-faced ductile iron */}
      <group position={[0, PISTON_HEIGHT / 2 - crownHeight * 0.35, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[pistonRadius + 0.002, 0.006, 12, 47, Math.PI * 2 - 0.15]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.98} roughness={0.02} />
        </mesh>
        {/* Visible ring gap - 0.020" at 0° */}
        <mesh position={[pistonRadius + 0.002, 0, 0]} castShadow>
          <boxGeometry args={[0.012, 0.012, ringGap]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
      
      {/* SECOND COMPRESSION RING - Cast iron, taper-faced */}
      <group position={[0, PISTON_HEIGHT / 2 - crownHeight * 0.55, 0]} rotation={[0, Math.PI * 2 / 3, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[pistonRadius + 0.002, 0.005, 12, 47, Math.PI * 2 - 0.12]} />
          <meshStandardMaterial color="#505050" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Visible ring gap - 0.022" at 120° */}
        <mesh position={[pistonRadius + 0.002, 0, 0]} castShadow>
          <boxGeometry args={[0.010, 0.010, ringGap * 1.1]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
      
      {/* OIL CONTROL RING - 3-piece stainless steel */}
      <group position={[0, PISTON_HEIGHT / 2 - crownHeight * 0.78, 0]} rotation={[0, Math.PI * 4 / 3, 0]}>
        {/* Upper rail */}
        <mesh position={[0, 0.004, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[pistonRadius + 0.002, 0.002, 8, 48]} />
          <meshStandardMaterial color="#404040" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Expander (center) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[pistonRadius + 0.001, 0.003, 8, 48]} />
          <meshStandardMaterial color="#353535" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Lower rail */}
        <mesh position={[0, -0.004, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[pistonRadius + 0.002, 0.002, 8, 48]} />
          <meshStandardMaterial color="#404040" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Visible ring gap - 0.025" at 240° */}
        <mesh position={[pistonRadius + 0.001, 0, 0]} castShadow>
          <boxGeometry args={[0.008, 0.010, ringGap * 1.25]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
      
      {/* === WRIST PIN AREA (middle section) - with visible through-hole === */}
      {/* Left side wall (partial cylinder) */}
      <mesh position={[-pistonRadius * 0.5, wristPinY, 0]} castShadow>
        <boxGeometry args={[pistonRadius * 0.5, pinAreaHeight * 0.8, pistonRadius * 1.4]} />
        <meshStandardMaterial color="#b0b0b0" metalness={0.93} roughness={0.1} />
      </mesh>
      {/* Right side wall (partial cylinder) */}
      <mesh position={[pistonRadius * 0.5, wristPinY, 0]} castShadow>
        <boxGeometry args={[pistonRadius * 0.5, pinAreaHeight * 0.8, pistonRadius * 1.4]} />
        <meshStandardMaterial color="#b0b0b0" metalness={0.93} roughness={0.1} />
      </mesh>
      
      {/* Wrist pin bosses - reinforced aluminum, extending inward */}
      <mesh position={[pistonRadius * 0.6, wristPinY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.028, 0.032, pistonRadius * 0.45, 16]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.88} roughness={0.15} />
      </mesh>
      <mesh position={[-pistonRadius * 0.6, wristPinY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.028, 0.032, pistonRadius * 0.45, 16]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.88} roughness={0.15} />
      </mesh>
      
      {/* Wrist pin - 52100 bearing steel, full floating, visible through bore */}
      <mesh position={[0, wristPinY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[WRIST_PIN_DIA / 2, WRIST_PIN_DIA / 2, pistonRadius * 1.75, 24]} />
        <meshStandardMaterial color="#a5a5a5" metalness={0.98} roughness={0.03} />
      </mesh>
      
      {/* Wrist pin retaining clips (spiral locks) */}
      <mesh position={[pistonRadius * 0.82, wristPinY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[WRIST_PIN_DIA / 2 - 0.002, 0.003, 8, 16]} />
        <meshStandardMaterial color="#606060" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[-pistonRadius * 0.82, wristPinY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[WRIST_PIN_DIA / 2 - 0.002, 0.003, 8, 16]} />
        <meshStandardMaterial color="#606060" metalness={0.85} roughness={0.2} />
      </mesh>
      
      {/* === SKIRT SECTION (bottom 40%) - extends below wrist pin === */}
      {/* Left skirt panel */}
      <mesh position={[-pistonRadius * 0.65, wristPinY - pinAreaHeight * 0.4 - skirtHeight * 0.35, 0]} castShadow>
        <boxGeometry args={[pistonRadius * 0.35, skirtHeight * 0.7, pistonRadius * 1.3]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.9} roughness={0.12} />
      </mesh>
      {/* Right skirt panel */}
      <mesh position={[pistonRadius * 0.65, wristPinY - pinAreaHeight * 0.4 - skirtHeight * 0.35, 0]} castShadow>
        <boxGeometry args={[pistonRadius * 0.35, skirtHeight * 0.7, pistonRadius * 1.3]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.9} roughness={0.12} />
      </mesh>
      
      {/* Skirt thrust faces (curved, at front/back of piston) */}
      <mesh position={[0, wristPinY - pinAreaHeight * 0.4 - skirtHeight * 0.25, pistonRadius * 0.7]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[skirtHeight * 0.5, skirtHeight * 0.45, pistonRadius * 0.4, 16, 1, false, -Math.PI / 3, Math.PI * 2 / 3]} />
        <meshStandardMaterial color="#989898" metalness={0.88} roughness={0.15} />
      </mesh>
      <mesh position={[0, wristPinY - pinAreaHeight * 0.4 - skirtHeight * 0.25, -pistonRadius * 0.7]} rotation={[0, -Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[skirtHeight * 0.5, skirtHeight * 0.45, pistonRadius * 0.4, 16, 1, false, -Math.PI / 3, Math.PI * 2 / 3]} />
        <meshStandardMaterial color="#989898" metalness={0.88} roughness={0.15} />
      </mesh>
      
      {/* Debug: wrist pin center */}
      {debugMode && (
        <DebugSphere position={[0, wristPinY, 0]} color="#00ff00" size={0.012} />
      )}
    </group>
  );
}

// ============================================================================
// DETAILED CONNECTING ROD (I-Beam Design)
// ============================================================================
function DetailedConnectingRod({ debugMode }: { debugMode: boolean }) {
  const beamLength = ROD_LENGTH - 0.05;
  const bigEndRadius = ROD_JOURNAL_DIA / 2 + 0.018;
  const smallEndRadius = WRIST_PIN_DIA / 2 + 0.012;
  
  return (
    <group>
      {/* Big end upper half (rod body) - split cap design */}
      <mesh castShadow>
        <cylinderGeometry args={[bigEndRadius, bigEndRadius, 0.065, 28, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#555" metalness={0.92} roughness={0.12} />
      </mesh>
      
      {/* Big end cap (lower half - removable) */}
      <mesh rotation={[0, 0, Math.PI]} castShadow>
        <cylinderGeometry args={[bigEndRadius, bigEndRadius, 0.065, 28, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.9} roughness={0.15} />
      </mesh>
      
      {/* Split line between rod and cap */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <boxGeometry args={[bigEndRadius * 2.1, 0.07, 0.003]} />
        <meshStandardMaterial color="#222" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Big end bearing insert (copper-colored tri-metal shell) */}
      {/* Using authentic SBC 350 rod bearing specs: 0.062" shell thickness, 2.1" journal */}
      {/* Shell inner surface at INSTALLED_ID/2, extends outward by SHELL_THICKNESS */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[
          ((ROD_BEARINGS.INSTALLED_ID * SCALE_FACTOR) / 2) + ((ROD_BEARINGS.SHELL_THICKNESS * SCALE_FACTOR) / 2), 
          (ROD_BEARINGS.SHELL_THICKNESS * SCALE_FACTOR) / 2, 
          12, 
          28
        ]} />
        <meshStandardMaterial color="#c0a060" metalness={0.78} roughness={0.22} />
      </mesh>
      
      {/* Rod cap bolts with ARP-style heads (2 per side) */}
      {[-1, 1].map((side) => (
        <group key={`bolt-${side}`}>
          {/* Bolt shank */}
          <mesh position={[side * (bigEndRadius + 0.012), 0, 0]} rotation={[0, 0, side * 0.15]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.06, 10]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.92} roughness={0.1} />
          </mesh>
          {/* Bolt head (12-point) */}
          <mesh position={[side * (bigEndRadius + 0.012), -0.035, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.012, 12]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.15} />
          </mesh>
          {/* Bolt washer */}
          <mesh position={[side * (bigEndRadius + 0.012), -0.026, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.003, 12]} />
            <meshStandardMaterial color="#505050" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      
      {/* I-Beam rod body */}
      <mesh position={[0, ROD_LENGTH / 2, 0]} castShadow>
        <boxGeometry args={[0.028, beamLength, 0.012]} />
        <meshStandardMaterial color="#757575" metalness={0.88} roughness={0.18} />
      </mesh>
      
      {/* I-Beam flanges (top and bottom of I) */}
      <mesh position={[0, ROD_LENGTH / 2, 0.012]} castShadow>
        <boxGeometry args={[0.04, beamLength - 0.04, 0.006]} />
        <meshStandardMaterial color="#707070" metalness={0.88} roughness={0.2} />
      </mesh>
      <mesh position={[0, ROD_LENGTH / 2, -0.012]} castShadow>
        <boxGeometry args={[0.04, beamLength - 0.04, 0.006]} />
        <meshStandardMaterial color="#707070" metalness={0.88} roughness={0.2} />
      </mesh>
      
      {/* Oil passage hole in rod */}
      <mesh position={[0, ROD_LENGTH * 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.004, 0.004, 0.03, 8]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Small end (wrist pin end) */}
      <mesh position={[0, ROD_LENGTH, 0]} castShadow>
        <cylinderGeometry args={[smallEndRadius, smallEndRadius, 0.035, 20]} />
        <meshStandardMaterial color="#606060" metalness={0.9} roughness={0.15} />
      </mesh>
      
      {/* Small end bushing */}
      <mesh position={[0, ROD_LENGTH, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[smallEndRadius - 0.006, 0.004, 8, 20]} />
        <meshStandardMaterial color="#cd7f32" metalness={0.6} roughness={0.35} />
      </mesh>
      
      {/* Debug: big end center (crankpin location) */}
      {debugMode && (
        <>
          <DebugSphere position={[0, 0, 0]} color="#ff0000" size={0.015} />
          <DebugSphere position={[0, ROD_LENGTH, 0]} color="#00ff00" size={0.012} />
        </>
      )}
    </group>
  );
}

// ============================================================================
// PISTON ASSEMBLY WITH KINEMATICS
// ============================================================================
function PistonAssembly({ 
  cylinderIndex,
  phaseOffset,
  bankSide,
  engineRef,
  debugMode,
  onTelemetry
}: { 
  cylinderIndex: number;
  phaseOffset: number;
  bankSide: 1 | -1;
  engineRef: React.MutableRefObject<{ crankAngle: number }>;
  debugMode: boolean;
  onTelemetry?: (cylinderNumber: number, data: { rodAngleDeg: number; pistonPositionInches: number; phase: 'compression' | 'power' | 'exhaust' | 'intake' }) => void;
}) {
  const pistonRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Group>(null);
  const debugCrankpinRef = useRef<THREE.Mesh>(null);
  const frameCount = useRef(0);

  // SBC 350: Left bank (driver side) is offset forward due to rod side-by-side on crank journal
  // bankSide = 1 (right bank): no offset; bankSide = -1 (left bank): forward offset
  const bankZOffset = bankSide === -1 ? BANK_OFFSET : 0;
  const zPos = FIRST_CYLINDER_Z + cylinderIndex * CYLINDER_SPACING + bankZOffset;
  const bankAngle = bankSide * BANK_ANGLE;
  
  // Cylinder number: right bank = 1,3,5,7, left bank = 2,4,6,8
  const cylinderNumber = bankSide === 1 ? (cylinderIndex * 2 + 1) : (cylinderIndex * 2 + 2);

  // SBC 350 Authentic Piston Geometry:
  // - Compression height = 1.550" (pin center to crown) 
  // - Deck height = 9.025" (crank center to deck)
  // - At TDC: crown at deck_height - deck_clearance from crank center
  // Wrist pin local Y = position in piston-local space (crown is at +PISTON_HEIGHT/2)
  // Since compression height > half of piston height, pin is BELOW piston center
  const WRIST_PIN_LOCAL_Y = (PISTON_HEIGHT / 2) - PISTON_COMPRESSION_HEIGHT;
  
  // Real stroke in inches for telemetry
  const STROKE_INCHES = CRANKSHAFT.STROKE; // 3.48"
  const ROD_LENGTH_INCHES = CONNECTING_ROD.LENGTH; // 5.7"
  const CRANK_RADIUS_INCHES = CRANKSHAFT.CRANK_THROW; // 1.74"
  
  // Pre-calculated TDC/BDC wrist pin distances from crank center (for debug markers)
  const TDC_WRIST_PIN_DIST = CRANK_RADIUS + ROD_LENGTH; // Maximum distance
  const BDC_WRIST_PIN_DIST = ROD_LENGTH - CRANK_RADIUS; // Minimum distance
  
  // Maximum rod angle occurs at 90° after TDC (mid-stroke)
  // sin(max_rod_angle) = crank_radius / rod_length
  // For SBC 350: sin(θ) = 1.74 / 5.7 = 0.305, θ = 17.77°
  const MAX_ROD_ANGLE_DEG = Math.asin(CRANK_RADIUS_INCHES / ROD_LENGTH_INCHES) * (180 / Math.PI);
  
  // Debug logging ref (only log periodically to avoid spam)
  const lastLogTime = useRef(0);

  useFrame(() => {
    if (!pistonRef.current || !rodRef.current) return;
    
    const theta = engineRef.current.crankAngle + phaseOffset;
    
    // Crankpin position (rotates with crank)
    const crankPinX = -CRANK_RADIUS * Math.sin(theta);
    const crankPinY = CRANK_RADIUS * Math.cos(theta);
    
    // Cylinder bore direction
    const boreX = Math.sin(bankAngle);
    const boreY = Math.cos(bankAngle);
    
    // SLIDER-CRANK KINEMATICS (Standard Formula)
    // pistonDist = r*cos(θ) + sqrt(l² - (r*sin(θ))²)
    // where: r = crank radius, l = rod length, θ = crank angle (adjusted for bank)
    // This is the EXACT formula from the reference spec, accounting for V-bank angle
    const angleDiff = theta + bankAngle;
    const cosAngleDiff = Math.cos(angleDiff);
    const sinAngleDiff = Math.sin(angleDiff);
    const pistonDist = CRANK_RADIUS * cosAngleDiff + 
                       Math.sqrt(ROD_LENGTH * ROD_LENGTH - CRANK_RADIUS * CRANK_RADIUS * sinAngleDiff * sinAngleDiff);
    
    // Wrist pin world position (where the pin should be)
    const wristPinX = pistonDist * boreX;
    const wristPinY = pistonDist * boreY;
    
    // Position piston so its local wrist pin aligns with calculated world position
    // The piston is rotated by -bankAngle, so the local Y offset rotates too
    // After rotation by -bankAngle, local (0, WRIST_PIN_LOCAL_Y) becomes:
    //   x_offset = WRIST_PIN_LOCAL_Y * sin(bankAngle)  (sin(-bankAngle) = -sin(bankAngle))
    //   y_offset = WRIST_PIN_LOCAL_Y * cos(bankAngle)  (cos(-bankAngle) = cos(bankAngle))
    // To put wrist pin at (wristPinX, wristPinY), piston center must be at:
    const pistonCenterX = wristPinX - WRIST_PIN_LOCAL_Y * Math.sin(bankAngle);
    const pistonCenterY = wristPinY - WRIST_PIN_LOCAL_Y * Math.cos(bankAngle);
    pistonRef.current.position.x = pistonCenterX;
    pistonRef.current.position.y = pistonCenterY;
    
    // Position rod at crankpin
    rodRef.current.position.x = crankPinX;
    rodRef.current.position.y = crankPinY;
    
    // Rotate rod to point from crankpin toward wrist pin
    // Rod small end should meet the wrist pin exactly
    const rodAngle = Math.atan2(wristPinX - crankPinX, wristPinY - crankPinY);
    rodRef.current.rotation.z = -rodAngle;
    
    // Debug crankpin marker follows the crankpin
    if (debugCrankpinRef.current) {
      debugCrankpinRef.current.position.x = crankPinX;
      debugCrankpinRef.current.position.y = crankPinY;
    }
    
    // Report telemetry every 10 frames (for performance)
    frameCount.current++;
    if (onTelemetry && debugMode && frameCount.current % 10 === 0) {
      // Calculate rod angle FROM BORE AXIS (subtract bank angle to normalize to bore direction)
      // Rod angle in world space minus the bank angle gives deviation from bore
      const rodAngleFromBore = rodAngle - bankAngle;
      // Normalize to -180 to +180 range
      let rodAngleDeg = rodAngleFromBore * (180 / Math.PI);
      while (rodAngleDeg > 180) rodAngleDeg -= 360;
      while (rodAngleDeg < -180) rodAngleDeg += 360;
      
      // Calculate piston position in inches from TDC
      // TDC is when piston is at max distance, so invert
      const maxDist = CRANK_RADIUS + ROD_LENGTH;
      const pistonPositionModel = maxDist - pistonDist;
      const pistonPositionInches = (pistonPositionModel / SCALE_FACTOR);
      
      // Determine phase based on crank angle (720° cycle)
      const cycleAngle = ((theta * 180 / Math.PI) % 720 + 720) % 720;
      let phase: 'compression' | 'power' | 'exhaust' | 'intake';
      if (cycleAngle < 180) phase = 'compression';
      else if (cycleAngle < 360) phase = 'power';
      else if (cycleAngle < 540) phase = 'exhaust';
      else phase = 'intake';
      
      onTelemetry(cylinderNumber, { rodAngleDeg, pistonPositionInches, phase });
    }
    
    // Debug console logging (once per second to avoid spam)
    if (debugMode && cylinderNumber === 1) {
      const now = Date.now();
      if (now - lastLogTime.current > 1000) {
        lastLogTime.current = now;
        const maxDist = CRANK_RADIUS + ROD_LENGTH;
        const minDist = ROD_LENGTH - CRANK_RADIUS;
        const pistonTravel = maxDist - pistonDist;
        const pistonTravelInches = pistonTravel / SCALE_FACTOR;
        const strokePercent = (pistonTravel / (maxDist - minDist)) * 100;
        
        // Calculate rod angle for this frame
        const rodAngleFromBore = rodAngle - bankAngle;
        let rodAngleDeg = rodAngleFromBore * (180 / Math.PI);
        while (rodAngleDeg > 180) rodAngleDeg -= 360;
        while (rodAngleDeg < -180) rodAngleDeg += 360;
        
        console.log(`[SBC 350 Debug] Cylinder 1 Piston Travel:`);
        console.log(`  Position from TDC: ${pistonTravelInches.toFixed(3)}" (${strokePercent.toFixed(1)}% of stroke)`);
        console.log(`  Stroke spec: ${STROKE_INCHES.toFixed(3)}" | Actual max travel: ${((maxDist - minDist) / SCALE_FACTOR).toFixed(3)}"`);
        console.log(`  Rod angle: ${rodAngleDeg.toFixed(1)}° (max expected: ±${MAX_ROD_ANGLE_DEG.toFixed(1)}°)`);
        console.log(`  TDC dist: ${(maxDist / SCALE_FACTOR).toFixed(3)}" | BDC dist: ${(minDist / SCALE_FACTOR).toFixed(3)}" | Current: ${(pistonDist / SCALE_FACTOR).toFixed(3)}"`);
      }
    }
  });

  // Calculate TDC/BDC marker positions along the bore axis
  const boreX = Math.sin(bankAngle);
  const boreY = Math.cos(bankAngle);
  
  // TDC position: wrist pin at max distance, then offset by compression height to get crown
  const tdcCrownDist = TDC_WRIST_PIN_DIST + PISTON_COMPRESSION_HEIGHT;
  const tdcMarkerX = tdcCrownDist * boreX;
  const tdcMarkerY = tdcCrownDist * boreY;
  
  // BDC position: wrist pin at min distance, then offset by compression height
  const bdcCrownDist = BDC_WRIST_PIN_DIST + PISTON_COMPRESSION_HEIGHT;
  const bdcMarkerX = bdcCrownDist * boreX;
  const bdcMarkerY = bdcCrownDist * boreY;
  
  // Deck position (for deck clearance visualization)
  const deckDist = DECK_HEIGHT; // 9.025" in scaled units
  const deckMarkerX = deckDist * boreX;
  const deckMarkerY = deckDist * boreY;
  
  return (
    <group position={[0, CRANKSHAFT_Y, zPos]}>
      {/* Piston group - RINGS ARE CHILDREN (locked motion, no independent float) */}
      {/* Crown faces UP along cylinder bore toward combustion chamber */}
      {/* Negate bankAngle so local +Y points toward cylinder head, not away */}
      <group ref={pistonRef} rotation={[0, 0, -bankAngle]}>
        <DetailedPiston debugMode={debugMode} bankSide={bankSide} />
      </group>

      {/* Connecting rod group - fixed length, no stretch */}
      <group ref={rodRef}>
        <DetailedConnectingRod debugMode={debugMode} />
      </group>
      
      {/* Debug: animated crankpin position */}
      {debugMode && (
        <mesh ref={debugCrankpinRef}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
      
      {/* Debug: TDC/BDC position markers */}
      {debugMode && (
        <group>
          {/* TDC marker - GREEN line at piston crown position at TDC */}
          <group position={[tdcMarkerX, tdcMarkerY, 0]}>
            <mesh rotation={[0, 0, -bankAngle]}>
              <boxGeometry args={[BORE * 1.1, 0.004, 0.01]} />
              <meshBasicMaterial color="#00ff00" transparent opacity={0.8} />
            </mesh>
            <Html
              position={[0.08, 0, 0]}
              center={false}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <div className="text-[8px] font-mono text-green-400 bg-black/70 px-1 rounded whitespace-nowrap">
                TDC
              </div>
            </Html>
          </group>
          
          {/* BDC marker - RED line at piston crown position at BDC */}
          <group position={[bdcMarkerX, bdcMarkerY, 0]}>
            <mesh rotation={[0, 0, -bankAngle]}>
              <boxGeometry args={[BORE * 1.1, 0.004, 0.01]} />
              <meshBasicMaterial color="#ff4444" transparent opacity={0.8} />
            </mesh>
            <Html
              position={[0.08, 0, 0]}
              center={false}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <div className="text-[8px] font-mono text-red-400 bg-black/70 px-1 rounded whitespace-nowrap">
                BDC
              </div>
            </Html>
          </group>
          
          {/* Deck surface marker - CYAN line at deck height */}
          <group position={[deckMarkerX, deckMarkerY, 0]}>
            <mesh rotation={[0, 0, -bankAngle]}>
              <boxGeometry args={[BORE * 1.2, 0.003, 0.015]} />
              <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
            </mesh>
            <Html
              position={[0.1, 0, 0]}
              center={false}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <div className="text-[8px] font-mono text-cyan-400 bg-black/70 px-1 rounded whitespace-nowrap">
                DECK
              </div>
            </Html>
          </group>
          
          {/* Stroke measurement indicator - vertical line showing full stroke travel */}
          <DebugLine 
            start={[tdcMarkerX + 0.05, tdcMarkerY, 0]} 
            end={[bdcMarkerX + 0.05, bdcMarkerY, 0]} 
            color="#ffff00" 
          />
        </group>
      )}
    </group>
  );
}

// ============================================================================
// DETAILED CRANKSHAFT
// ============================================================================
function DetailedCrankshaft({ engineRef, debugMode }: { engineRef: React.MutableRefObject<{ crankAngle: number }>; debugMode: boolean }) {
  const crankRef = useRef<THREE.Group>(null);
  const mainJournalRadius = MAIN_JOURNAL_DIA / 2;
  const rodJournalRadius = ROD_JOURNAL_DIA / 2;
  
  // 5 main bearings, 4 rod journals (cross-plane V8)
  const crankpinAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  useFrame(() => {
    if (crankRef.current) {
      crankRef.current.rotation.z = engineRef.current.crankAngle;
    }
  });

  return (
    <group ref={crankRef} position={[0, CRANKSHAFT_Y, 0]}>
      {/* Main shaft through entire length */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[mainJournalRadius, mainJournalRadius, BLOCK_LENGTH * 0.95, 32]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.95} roughness={0.08} />
      </mesh>
      
      {/* Main bearing journals (polished surfaces) */}
      {MAIN_BEARING_POSITIONS.map((zPos, i) => (
        <mesh key={`main-${i}`} position={[0, 0, zPos]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[mainJournalRadius + 0.003, mainJournalRadius + 0.003, 0.08, 32]} />
          <meshStandardMaterial color="#5a5a5a" metalness={0.98} roughness={0.04} />
        </mesh>
      ))}

      {/* Crankpin throws with 8 counterweights (2 per throw for internal balance) */}
      {/* SBC 350 uses heavy bob-weights positioned opposite to rod journals */}
      {crankpinAngles.map((angle, i) => {
        const zPos = CRANKPIN_Z_POSITIONS[i];
        const counterweightRadius = toUnits(CRANKSHAFT.COUNTERWEIGHT_RADIUS); // 3.5" radius
        const counterweightThickness = toUnits(CRANKSHAFT.COUNTERWEIGHT_THICKNESS); // 0.75" thick
        const webWidth = 0.035; // Width of each crank web
        const counterweightZOffset = 0.045; // Offset from crankpin center for each counterweight
        
        return (
          <group key={`throw-${i}`} position={[0, 0, zPos]} rotation={[0, 0, angle]}>
            {/* Front crank arm (web) to crankpin */}
            <mesh position={[0, CRANK_RADIUS / 2, counterweightZOffset]} castShadow>
              <boxGeometry args={[0.055, CRANK_RADIUS, webWidth]} />
              <meshStandardMaterial color="#505050" metalness={0.9} roughness={0.12} />
            </mesh>
            
            {/* Rear crank arm (web) to crankpin */}
            <mesh position={[0, CRANK_RADIUS / 2, -counterweightZOffset]} castShadow>
              <boxGeometry args={[0.055, CRANK_RADIUS, webWidth]} />
              <meshStandardMaterial color="#505050" metalness={0.9} roughness={0.12} />
            </mesh>
            
            {/* Crankpin journal - wider for both rods (side-by-side) */}
            <mesh position={[0, CRANK_RADIUS, 0]} castShadow>
              <cylinderGeometry args={[rodJournalRadius, rodJournalRadius, 0.12, 24]} />
              <meshStandardMaterial color="#606060" metalness={0.97} roughness={0.05} />
            </mesh>
            
            {/* ============================================================ */}
            {/* FRONT COUNTERWEIGHT (#1 of pair) - positioned on front side */}
            {/* Heavy bob-weight for internal balance, opposite to rod journal */}
            {/* ============================================================ */}
            <group position={[0, 0, counterweightZOffset]}>
              {/* Main counterweight body */}
              <mesh position={[0, -CRANK_RADIUS * 0.7, 0]} castShadow>
                <boxGeometry args={[counterweightRadius * 0.55, CRANK_RADIUS * 1.5, counterweightThickness]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.2} />
              </mesh>
              
              {/* Counterweight rounded outer edge */}
              <mesh position={[0, -CRANK_RADIUS * 1.45, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[counterweightRadius * 0.275, counterweightRadius * 0.275, counterweightThickness, 20, 1, false, 0, Math.PI]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.2} />
              </mesh>
              
              {/* Weight reduction holes (Chevy style - Mallory metal for balance) */}
              <mesh position={[-0.035, -CRANK_RADIUS * 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.010, 0.010, counterweightThickness + 0.01, 12]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
              </mesh>
              <mesh position={[0.035, -CRANK_RADIUS * 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.010, 0.010, counterweightThickness + 0.01, 12]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
              </mesh>
            </group>
            
            {/* ============================================================ */}
            {/* REAR COUNTERWEIGHT (#2 of pair) - positioned on rear side */}
            {/* Mirror of front counterweight for balanced mass distribution */}
            {/* ============================================================ */}
            <group position={[0, 0, -counterweightZOffset]}>
              {/* Main counterweight body */}
              <mesh position={[0, -CRANK_RADIUS * 0.7, 0]} castShadow>
                <boxGeometry args={[counterweightRadius * 0.55, CRANK_RADIUS * 1.5, counterweightThickness]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.2} />
              </mesh>
              
              {/* Counterweight rounded outer edge */}
              <mesh position={[0, -CRANK_RADIUS * 1.45, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[counterweightRadius * 0.275, counterweightRadius * 0.275, counterweightThickness, 20, 1, false, 0, Math.PI]} />
                <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.2} />
              </mesh>
              
              {/* Weight reduction holes (Chevy style - Mallory metal for balance) */}
              <mesh position={[-0.035, -CRANK_RADIUS * 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.010, 0.010, counterweightThickness + 0.01, 12]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
              </mesh>
              <mesh position={[0.035, -CRANK_RADIUS * 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.010, 0.010, counterweightThickness + 0.01, 12]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
              </mesh>
            </group>
            
            {/* Debug: crankpin center marker */}
            {debugMode && (
              <DebugSphere position={[0, CRANK_RADIUS, 0]} color="#ffff00" size={0.012} />
            )}
          </group>
        );
      })}

      {/* Front snout for pulley */}
      <mesh position={[0, 0, BLOCK_LENGTH / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 20]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.92} roughness={0.1} />
      </mesh>
      
      {/* Keyway slot */}
      <mesh position={[0.035, 0, BLOCK_LENGTH / 2 + 0.02]} castShadow>
        <boxGeometry args={[0.008, 0.015, 0.06]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Flywheel flange (rear) */}
      <mesh position={[0, 0, -BLOCK_LENGTH / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.08, 0.05, 32]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.9} roughness={0.15} />
      </mesh>
      
      {/* Flywheel bolt pattern */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={`flywheel-bolt-${i}`} position={[Math.cos(angle) * 0.07, Math.sin(angle) * 0.07, -BLOCK_LENGTH / 2 - 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.015, 8]} />
            <meshStandardMaterial color="#555" metalness={0.85} roughness={0.2} />
          </mesh>
        );
      })}
      
      {/* Flywheel main body */}
      <mesh position={[0, 0, -BLOCK_LENGTH / 2 - 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 48]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.75} roughness={0.3} />
      </mesh>
      
      {/* Flywheel friction surface (for clutch) */}
      <mesh position={[0, 0, -BLOCK_LENGTH / 2 - 0.075]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <ringGeometry args={[0.1, 0.22, 48]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Ring gear teeth (starter engagement) - 153 tooth gear on SBC */}
      {Array.from({ length: 48 }).map((_, i) => {
        const toothAngle = (i / 48) * Math.PI * 2;
        return (
          <mesh 
            key={`ring-tooth-${i}`} 
            position={[
              Math.cos(toothAngle) * 0.23,
              Math.sin(toothAngle) * 0.23,
              -BLOCK_LENGTH / 2 - 0.05
            ]} 
            rotation={[Math.PI / 2, 0, toothAngle]}
            castShadow
          >
            <boxGeometry args={[0.02, 0.025, 0.035]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// ENGINE BLOCK (Chevy 350 Style)
// Authentic SBC 350 block with lifter valley, cam tunnel, freeze plugs,
// bellhousing flange, starter mount, oil filter boss, and oil galleries
// ============================================================================

// Freeze plug diameter for SBC 350 (1.875" standard)
const FREEZE_PLUG_DIAMETER = toUnits(1.875);
const FREEZE_PLUG_RADIUS = FREEZE_PLUG_DIAMETER / 2;

// Cam bearing bore diameters (stepped - front is largest)
const CAM_BORE_FRONT = toUnits(CAM_BEARINGS.BLOCK_BORE_1); // 2.020"
const CAM_BORE_MID = toUnits(CAM_BEARINGS.BLOCK_BORE_3_4); // 2.000"

// Main journal diameter for saddle visualization
const MAIN_JOURNAL_RADIUS = toUnits(CRANKSHAFT.MAIN_JOURNAL_DIAMETER / 2); // 2.4488" / 2

// Lifter bore specs
const LIFTER_BORE_RADIUS = toUnits(BLOCK.LIFTER_BORE_DIAMETER / 2); // 0.8427" / 2
const LIFTER_BORE_DEPTH = toUnits(BLOCK.LIFTER_BORE_DEPTH); // 2.125"

function EngineBlock350({ debugMode, xrayMode = false }: { debugMode: boolean; xrayMode?: boolean }) {
  const boreRadius = BORE / 2;
  const cadMode = useCadMode();
  
  return (
    <group>
      {/* Main block - V shape with valley */}
      <mesh position={[0, 0.2, 0]} castShadow={!cadMode} receiveShadow={!cadMode}>
        <boxGeometry args={[BLOCK_WIDTH * 1.05, BLOCK_HEIGHT * 0.65, BLOCK_LENGTH]} />
        {cadMode ? (
          <meshBasicMaterial color="#000000" wireframe />
        ) : (
          <meshStandardMaterial 
            color={xrayMode ? "#3a3a3a" : "#1a1a1a"} 
            metalness={xrayMode ? 0.88 : 0.5} 
            roughness={xrayMode ? 0.15 : 0.6} 
            transparent={xrayMode}
            opacity={xrayMode ? 0.25 : 1}
            depthWrite={!xrayMode}
            side={xrayMode ? THREE.DoubleSide : THREE.FrontSide}
          />
        )}
      </mesh>

      {/* Cylinder banks */}
      {[-1, 1].map((side) => {
        const bankWallWidth = BORE + toUnits(2.0);
        const bankWallHeight = DECK_HEIGHT * 0.75;
        const bankWallYCenter = DECK_HEIGHT * 0.45;
        const bankWallXCenter = side * (BORE / 2 + toUnits(0.5));
        const boreLinerHeight = bankWallHeight;
        const deckSurfaceY = bankWallYCenter + bankWallHeight / 2;
        const boreFloorY = bankWallYCenter - bankWallHeight / 2;

        return (
        <group key={`bank-${side}`} rotation={[0, 0, side * BANK_ANGLE]}>
          {/* Thick cylinder bank wall - fully encloses bores */}
          <mesh position={[bankWallXCenter, bankWallYCenter, 0]} castShadow={!cadMode}>
            <boxGeometry args={[bankWallWidth, bankWallHeight, BLOCK_LENGTH * 0.92]} />
            {cadMode ? (
              <meshBasicMaterial color="#000000" wireframe />
            ) : (
              <meshStandardMaterial 
                color={xrayMode ? "#3a3a3a" : "#202020"} 
                metalness={xrayMode ? 0.88 : 0.45} 
                roughness={xrayMode ? 0.15 : 0.65} 
                transparent={xrayMode}
                opacity={xrayMode ? 0.25 : 1}
                depthWrite={!xrayMode}
                side={xrayMode ? THREE.DoubleSide : THREE.FrontSide}
              />
            )}
          </mesh>
          
          {/* Individual cylinder bores */}
          {[0, 1, 2, 3].map((i) => {
            const bankZOffset = side === -1 ? BANK_OFFSET : 0;
            const zPos = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + bankZOffset;
            return (
              <group key={`cylinder-${side}-${i}`}>
                {/* Cylinder bore liner - tall to match bank wall */}
                <mesh position={[bankWallXCenter, bankWallYCenter, zPos]}>
                  <cylinderGeometry args={[boreRadius, boreRadius, boreLinerHeight, 32, 1, true]} />
                  {cadMode ? (
                    <meshBasicMaterial color="#000000" wireframe />
                  ) : (
                    <meshStandardMaterial 
                      color={xrayMode ? "#3a3a3a" : "#333"} 
                      metalness={xrayMode ? 0.88 : 0.4} 
                      roughness={xrayMode ? 0.15 : 0.7} 
                      side={THREE.DoubleSide} 
                      transparent={xrayMode}
                      opacity={xrayMode ? 0.25 : 1}
                      depthWrite={!xrayMode}
                    />
                  )}
                </mesh>

                {/* Bore liner floor - seals bottom of bore */}
                <mesh position={[bankWallXCenter, boreFloorY, zPos]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[boreRadius, 32]} />
                  {cadMode ? (
                    <meshBasicMaterial color="#000000" wireframe />
                  ) : (
                    <meshStandardMaterial 
                      color={xrayMode ? "#3a3a3a" : "#222"} 
                      metalness={xrayMode ? 0.88 : 0.4} 
                      roughness={xrayMode ? 0.15 : 0.7} 
                      side={THREE.DoubleSide}
                      transparent={xrayMode}
                      opacity={xrayMode ? 0.25 : 1}
                      depthWrite={!xrayMode}
                    />
                  )}
                </mesh>
                
                {/* Deck surface around bore - wide ring covering full area */}
                <mesh position={[bankWallXCenter, deckSurfaceY, zPos]} rotation={[-Math.PI / 2, 0, 0]} castShadow={!cadMode}>
                  <ringGeometry args={[boreRadius, BORE / 2 + toUnits(1.5), 32]} />
                  {cadMode ? (
                    <meshBasicMaterial color="#000000" wireframe />
                  ) : (
                    <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
                  )}
                </mesh>
                
                {/* Head bolt bosses (4 per cylinder) */}
                {[0, 1, 2, 3].map((j) => {
                  const boltAngle = (j / 4) * Math.PI * 2 + Math.PI / 4;
                  const boltRadius = boreRadius + 0.06;
                  return (
                    <mesh 
                      key={`bolt-boss-${j}`}
                      position={[
                        bankWallXCenter + Math.cos(boltAngle) * boltRadius * (side),
                        deckSurfaceY + 0.01, 
                        zPos + Math.sin(boltAngle) * boltRadius
                      ]} 
                      castShadow={!cadMode}
                    >
                      <cylinderGeometry args={[0.012, 0.012, 0.025, 8]} />
                      {cadMode ? (
                        <meshBasicMaterial color="#000000" wireframe />
                      ) : (
                        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.25} />
                      )}
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>
        );
      })}

      {/* Valley cover / intake manifold mounting surface */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.35, 0.08, BLOCK_LENGTH * 0.85]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.7} />
      </mesh>

      {/* ================================================================== */}
      {/* LIFTER VALLEY with 16 Visible Bores (8 per bank, 2 per cylinder) */}
      {/* V-shaped area between cylinder banks */}
      {/* ================================================================== */}
      
      {/* Lifter valley base - machined surface */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.15, BLOCK_LENGTH * 0.8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
      </mesh>
      
      {/* 16 Lifter bores - vertical cylindrical holes */}
      {/* 8 per side (2 per cylinder), positioned along cylinder spacing */}
      {[0, 1, 2, 3].map((cylIndex) => {
        return (
          <group key={`lifter-pair-${cylIndex}`}>
            {/* Two lifters per cylinder (intake and exhaust) */}
            {[-1, 1].map((side) => {
              // Apply bank offset: left bank (side=-1) is forward
              const bankZOffset = side === -1 ? BANK_OFFSET : 0;
              const cylZ = FIRST_CYLINDER_Z + cylIndex * CYLINDER_SPACING + bankZOffset;
              // Each cylinder has 2 lifter bores - offset in Z for intake/exhaust
              const lifterOffsets = [-0.025, 0.025]; // Front (exhaust) and rear (intake) lifter
              return lifterOffsets.map((zOffset, lifterIdx) => {
                const lifterZ = cylZ + zOffset;
                const lifterX = side * 0.045; // Slight X offset toward each bank
                return (
                  <group key={`lifter-${side}-${lifterIdx}`}>
                    {/* Lifter bore - visible cylindrical hole */}
                    <mesh 
                      position={[lifterX, 0.38, lifterZ]} 
                      castShadow
                    >
                      <cylinderGeometry args={[LIFTER_BORE_RADIUS, LIFTER_BORE_RADIUS, 0.12, 16, 1, true]} />
                      <meshStandardMaterial 
                        color="#0a0a0a" 
                        metalness={0.6} 
                        roughness={0.3} 
                        side={THREE.DoubleSide} 
                      />
                    </mesh>
                    {/* Lifter bore rim - machined edge */}
                    <mesh 
                      position={[lifterX, 0.44, lifterZ]} 
                      rotation={[Math.PI / 2, 0, 0]}
                      castShadow
                    >
                      <ringGeometry args={[LIFTER_BORE_RADIUS, LIFTER_BORE_RADIUS + 0.008, 16]} />
                      <meshStandardMaterial color="#252525" metalness={0.5} roughness={0.4} />
                    </mesh>
                    {/* Bottom of bore (visible darkness) */}
                    <mesh 
                      position={[lifterX, 0.32, lifterZ]} 
                      rotation={[Math.PI / 2, 0, 0]}
                      castShadow
                    >
                      <circleGeometry args={[LIFTER_BORE_RADIUS * 0.9, 16]} />
                      <meshStandardMaterial color="#050505" metalness={0.2} roughness={0.9} />
                    </mesh>
                  </group>
                );
              });
            })}
          </group>
        );
      })}

      {/* ================================================================== */}
      {/* CAM TUNNEL - Horizontal bore through block center */}
      {/* 5 visible cam bearing bores using CAM_BEARINGS specs */}
      {/* ================================================================== */}
      
      {/* Main cam tunnel bore (visible through block) */}
      <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[CAM_BORE_MID / 2, CAM_BORE_MID / 2, BLOCK_LENGTH * 0.85, 24, 1, true]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      
      {/* 5 Cam bearing bores - stepped sizes per SBC spec */}
      {MAIN_BEARING_POSITIONS.map((zPos, i) => {
        // Front bearing (#1) is largest, middle smaller
        const isFirstBearing = i === 0;
        const bearingBoreRadius = isFirstBearing ? CAM_BORE_FRONT / 2 : CAM_BORE_MID / 2;
        const bearingInnerRadius = (CAM_BEARINGS.BEARING_ID * SCALE_FACTOR) / 2;
        const shellThickness = CAM_BEARINGS.BEARING_THICKNESS * SCALE_FACTOR;
        const torusMajorRadius = bearingInnerRadius + shellThickness / 2;
        const torusTubeRadius = shellThickness / 2;
        
        return (
          <group key={`cam-bearing-${i}`} position={[0, 0.25, zPos * 0.95]}>
            {/* Cam bearing bore in block */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[bearingBoreRadius, bearingBoreRadius, 0.04, 24, 1, true]} />
              <meshStandardMaterial color="#151515" metalness={0.55} roughness={0.35} side={THREE.DoubleSide} />
            </mesh>
            {/* Cam bearing shell - pressed into bore */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[torusMajorRadius, torusTubeRadius, 8, 24]} />
              <meshStandardMaterial color="#b89858" metalness={0.75} roughness={0.3} />
            </mesh>
          </group>
        );
      })}

      {/* ================================================================== */}
      {/* FREEZE PLUGS (Core Plugs) - 6 total, 3 per side */}
      {/* 1.875" diameter, positioned along block sides between cylinders */}
      {/* ================================================================== */}
      
      {[-1, 1].map((side) => {
        // 3 freeze plugs per side, positioned between cylinder pairs
        // Left side (side=-1) corresponds to left bank cylinders which are offset forward
        const bankZOffset = side === -1 ? BANK_OFFSET : 0;
        const freezePlugZPositions = [
          FIRST_CYLINDER_Z + CYLINDER_SPACING * 0.5 + bankZOffset,  // Between cyl 1-3 or 2-4
          0 + bankZOffset,                                           // Center of block
          LAST_CYLINDER_Z - CYLINDER_SPACING * 0.5 + bankZOffset,   // Between cyl 5-7 or 6-8
        ];
        
        return freezePlugZPositions.map((zPos, i) => (
          <group 
            key={`freeze-plug-${side}-${i}`} 
            position={[side * (BLOCK_WIDTH / 2 - 0.02), 0.15, zPos]}
            rotation={[0, 0, side * Math.PI / 2]}
          >
            {/* Freeze plug - shallow convex cap */}
            <mesh castShadow>
              <cylinderGeometry args={[FREEZE_PLUG_RADIUS, FREEZE_PLUG_RADIUS * 0.95, 0.015, 24]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.35} />
            </mesh>
            {/* Slight convex dome on plug surface */}
            <mesh position={[0, 0.008, 0]} castShadow>
              <sphereGeometry args={[FREEZE_PLUG_RADIUS * 0.85, 16, 8, 0, Math.PI * 2, 0, Math.PI / 6]} />
              <meshStandardMaterial color="#505050" metalness={0.65} roughness={0.4} />
            </mesh>
            {/* Plug seating edge */}
            <mesh position={[0, -0.008, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <ringGeometry args={[FREEZE_PLUG_RADIUS * 0.92, FREEZE_PLUG_RADIUS + 0.005, 24]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.5} />
            </mesh>
          </group>
        ));
      })}

      {/* ================================================================== */}
      {/* MAIN BEARING SADDLES (5 total) */}
      {/* Semicircular machined surfaces at bottom of block */}
      {/* Main journal diameter: 2.45" */}
      {/* ================================================================== */}
      
      {/* Main bearing caps / oil pan rail */}
      <mesh position={[0, -0.12, 0]} castShadow>
        <boxGeometry args={[BLOCK_WIDTH + 0.12, 0.18, BLOCK_LENGTH]} />
        <meshStandardMaterial color="#151515" metalness={0.6} roughness={0.5} />
      </mesh>
      
      {/* Main bearing saddles and shells (5 total with thrust bearing on #3) */}
      {/* Shell thickness: 0.093" per MAIN_BEARINGS specs */}
      {/* Center main (#3, index 2) has thrust faces for crankshaft end-play control */}
      {MAIN_BEARING_POSITIONS.map((zPos, i) => {
        const bearingInnerRadius = (MAIN_BEARINGS.INSTALLED_ID * SCALE_FACTOR) / 2;
        const shellThickness = MAIN_BEARINGS.SHELL_THICKNESS * SCALE_FACTOR; // 0.093" = 0.008 units
        const bearingWidth = MAIN_BEARINGS.BEARING_WIDTH * SCALE_FACTOR; // 1.002" = 0.086 units
        const torusMajorRadius = bearingInnerRadius + shellThickness / 2;
        const torusTubeRadius = shellThickness / 2;
        const saddleRadius = MAIN_JOURNAL_RADIUS + 0.01; // Slightly larger than journal
        const isThrustBearing = i === 2; // Center main (#3) is the thrust bearing
        const thrustFaceThickness = 0.008; // Thrust flange thickness
        const thrustFaceWidth = toUnits(CRANKSHAFT.END_PLAY * 10); // Visible thrust width
        
        return (
          <group key={`main-bearing-${i}`} position={[0, 0, zPos]}>
            {/* Main bearing saddle - semicircular machined surface in block */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[saddleRadius, 0.006, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Saddle web structure */}
            <mesh position={[0, 0.02, 0]} castShadow>
              <boxGeometry args={[saddleRadius * 2.2, 0.04, bearingWidth]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
            </mesh>
            
            {/* Upper bearing shell (in block saddle) - tri-metal babbit lined */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[torusMajorRadius, torusTubeRadius, 12, 28, Math.PI]} />
              <meshStandardMaterial color="#c0a070" metalness={0.8} roughness={0.25} />
            </mesh>
            {/* Lower bearing shell (in cap) */}
            <mesh rotation={[Math.PI / 2, 0, Math.PI]} castShadow>
              <torusGeometry args={[torusMajorRadius, torusTubeRadius, 12, 28, Math.PI]} />
              <meshStandardMaterial color="#c0a070" metalness={0.8} roughness={0.25} />
            </mesh>
            
            {/* Bearing shell inner surface - visible journal contact area */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[bearingInnerRadius, bearingInnerRadius, bearingWidth * 0.9, 28, 1, true]} />
              <meshStandardMaterial color="#b89858" metalness={0.75} roughness={0.3} side={THREE.DoubleSide} />
            </mesh>
            
            {/* ============================================================ */}
            {/* THRUST BEARING FACES - Only on center main (#3, index 2) */}
            {/* Controls crankshaft end-play (0.002-0.006" spec) */}
            {/* ============================================================ */}
            {isThrustBearing && (
              <>
                {/* Front thrust face - machined bronze surface */}
                <mesh position={[0, 0, bearingWidth / 2 + thrustFaceThickness / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <ringGeometry args={[bearingInnerRadius, bearingInnerRadius + shellThickness * 2.5, 28]} />
                  <meshStandardMaterial color="#cd9c46" metalness={0.85} roughness={0.15} />
                </mesh>
                {/* Front thrust face backing plate */}
                <mesh position={[0, 0, bearingWidth / 2 + thrustFaceThickness]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <ringGeometry args={[bearingInnerRadius - 0.002, bearingInnerRadius + shellThickness * 2.8, 28]} />
                  <meshStandardMaterial color="#8a7040" metalness={0.7} roughness={0.35} />
                </mesh>
                
                {/* Rear thrust face - machined bronze surface */}
                <mesh position={[0, 0, -(bearingWidth / 2 + thrustFaceThickness / 2)]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <ringGeometry args={[bearingInnerRadius, bearingInnerRadius + shellThickness * 2.5, 28]} />
                  <meshStandardMaterial color="#cd9c46" metalness={0.85} roughness={0.15} />
                </mesh>
                {/* Rear thrust face backing plate */}
                <mesh position={[0, 0, -(bearingWidth / 2 + thrustFaceThickness)]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <ringGeometry args={[bearingInnerRadius - 0.002, bearingInnerRadius + shellThickness * 2.8, 28]} />
                  <meshStandardMaterial color="#8a7040" metalness={0.7} roughness={0.35} />
                </mesh>
                
                {/* Thrust bearing oil grooves (radial slots for lubrication) */}
                {[0, 1, 2, 3].map((j) => {
                  const grooveAngle = (j / 4) * Math.PI * 2 + Math.PI / 8;
                  const grooveRadius = bearingInnerRadius + shellThickness * 1.2;
                  return (
                    <group key={`thrust-groove-${j}`}>
                      <mesh 
                        position={[
                          Math.cos(grooveAngle) * grooveRadius, 
                          Math.sin(grooveAngle) * grooveRadius, 
                          bearingWidth / 2 + thrustFaceThickness / 2
                        ]} 
                        rotation={[Math.PI / 2, 0, grooveAngle]}
                        castShadow
                      >
                        <boxGeometry args={[0.003, 0.015, 0.004]} />
                        <meshStandardMaterial color="#6a5530" metalness={0.5} roughness={0.6} />
                      </mesh>
                      <mesh 
                        position={[
                          Math.cos(grooveAngle) * grooveRadius, 
                          Math.sin(grooveAngle) * grooveRadius, 
                          -(bearingWidth / 2 + thrustFaceThickness / 2)
                        ]} 
                        rotation={[Math.PI / 2, 0, grooveAngle]}
                        castShadow
                      >
                        <boxGeometry args={[0.003, 0.015, 0.004]} />
                        <meshStandardMaterial color="#6a5530" metalness={0.5} roughness={0.6} />
                      </mesh>
                    </group>
                  );
                })}
              </>
            )}
          </group>
        );
      })}
      
      {/* 4-bolt main caps (characteristic of performance 350s) */}
      {MAIN_BEARING_POSITIONS.map((zPos, i) => (
        <group key={`main-cap-${i}`} position={[0, -0.18, zPos]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.06, 0.07]} />
            <meshStandardMaterial color="#222" metalness={0.7} roughness={0.4} />
          </mesh>
          {/* 4 bolts per main */}
          {[-0.06, -0.03, 0.03, 0.06].map((xOff, j) => (
            <mesh key={`cap-bolt-${j}`} position={[xOff, -0.035, 0]} castShadow>
              <cylinderGeometry args={[0.008, 0.008, 0.02, 8]} />
              <meshStandardMaterial color="#333" metalness={0.85} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ================================================================== */}
      {/* BELLHOUSING FLANGE - Rear of block */}
      {/* Standard Chevy bellhousing bolt pattern (6 bolts) */}
      {/* ================================================================== */}
      
      <group position={[0, 0.05, -BLOCK_LENGTH / 2 - 0.01]}>
        {/* Bellhousing flange - flat mounting surface */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.025, 32]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Machined mounting face */}
        <mesh position={[0, 0, -0.014]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <ringGeometry args={[0.08, 0.27, 32]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Crankshaft pilot bore (center) */}
        <mesh position={[0, 0, -0.015]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <ringGeometry args={[0.03, 0.05, 24]} />
          <meshStandardMaterial color="#111" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* 6 bellhousing bolt holes - standard Chevy pattern */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const boltAngle = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const boltRadius = 0.21;
          return (
            <group key={`bellhousing-bolt-${i}`}>
              {/* Bolt hole */}
              <mesh 
                position={[
                  Math.cos(boltAngle) * boltRadius,
                  Math.sin(boltAngle) * boltRadius,
                  -0.012
                ]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.012, 0.012, 0.03, 12]} />
                <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.7} />
              </mesh>
              {/* Bolt hole chamfer */}
              <mesh 
                position={[
                  Math.cos(boltAngle) * boltRadius,
                  Math.sin(boltAngle) * boltRadius,
                  -0.014
                ]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <ringGeometry args={[0.010, 0.018, 12]} />
                <meshStandardMaterial color="#252525" metalness={0.5} roughness={0.4} />
              </mesh>
            </group>
          );
        })}
        {/* Dowel pin holes (2) for alignment */}
        {[-1, 1].map((side) => (
          <mesh 
            key={`dowel-${side}`}
            position={[side * 0.15, 0.08, -0.015]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.008, 0.008, 0.025, 8]} />
            <meshStandardMaterial color="#050505" metalness={0.4} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* ================================================================== */}
      {/* STARTER MOUNT BOSS - Right side near rear */}
      {/* Flat machined boss with 2 mounting holes */}
      {/* ================================================================== */}
      
      <group position={[BLOCK_WIDTH / 2 - 0.02, -0.08, -BLOCK_LENGTH / 2 + 0.15]}>
        {/* Starter mount boss - flat machined surface */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.065, 0.04, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Machined mounting face */}
        <mesh position={[0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <ringGeometry args={[0.015, 0.055, 16]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* 2 starter bolt holes */}
        <mesh position={[0.022, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[0.022, -0.03, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>

      {/* ================================================================== */}
      {/* OIL FILTER BOSS - Left side near front */}
      {/* Cylindrical boss with internal threaded bore (3/4-16 thread) */}
      {/* ================================================================== */}
      
      <group position={[-BLOCK_WIDTH / 2 + 0.02, -0.05, BLOCK_LENGTH / 2 - 0.2]}>
        {/* Oil filter adapter boss */}
        <mesh rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.06, 20]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Machined mounting face */}
        <mesh position={[-0.03, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <ringGeometry args={[0.018, 0.042, 20]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Threaded bore center (3/4-16 thread for oil filter adapter) */}
        <mesh position={[-0.032, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.04, 12, 1, true]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.4} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        {/* Thread detail rings */}
        {[0, 1, 2, 3].map((i) => (
          <mesh 
            key={`thread-${i}`}
            position={[-0.02 - i * 0.008, 0, 0]} 
            rotation={[0, 0, -Math.PI / 2]} 
            castShadow
          >
            <torusGeometry args={[0.014, 0.001, 4, 16]} />
            <meshStandardMaterial color="#151515" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* ================================================================== */}
      {/* OIL GALLERIES (Visual Only) */}
      {/* Main oil gallery runs along camshaft centerline */}
      {/* ================================================================== */}
      
      {/* Main oil gallery - horizontal passage along cam centerline */}
      <mesh position={[0.08, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[toUnits(BLOCK.OIL_GALLERY_DIAMETER / 2), toUnits(BLOCK.OIL_GALLERY_DIAMETER / 2), BLOCK_LENGTH * 0.7, 12, 1, true]} />
        <meshStandardMaterial color="#080808" metalness={0.4} roughness={0.6} side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>
      {/* Secondary oil gallery (opposite side) */}
      <mesh position={[-0.08, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[toUnits(BLOCK.OIL_GALLERY_DIAMETER / 2) * 0.8, toUnits(BLOCK.OIL_GALLERY_DIAMETER / 2) * 0.8, BLOCK_LENGTH * 0.7, 12, 1, true]} />
        <meshStandardMaterial color="#080808" metalness={0.4} roughness={0.6} side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>
      {/* Vertical oil feed passages to main bearings */}
      {MAIN_BEARING_POSITIONS.map((zPos, i) => (
        <mesh key={`oil-feed-${i}`} position={[0, 0.09, zPos]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8, 1, true]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.7} side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Oil pan */}
      <mesh position={[0, -0.32, 0]} castShadow>
        <boxGeometry args={[BLOCK_WIDTH - 0.05, 0.12, BLOCK_LENGTH * 0.95]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.7} roughness={0.4} />
      </mesh>
      
      {/* Oil pan sump */}
      <mesh position={[0, -0.42, 0.1]} castShadow>
        <boxGeometry args={[0.35, 0.1, 0.5]} />
        <meshStandardMaterial color="#080808" metalness={0.75} roughness={0.35} />
      </mesh>
      
      {/* Timing cover (front) */}
      <mesh position={[0, 0.1, BLOCK_LENGTH / 2 + 0.02]} castShadow>
        <boxGeometry args={[0.45, 0.55, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.55} />
      </mesh>
      
      {/* Water pump boss */}
      <mesh position={[0, 0.15, BLOCK_LENGTH / 2 + 0.05]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 24]} />
        <meshStandardMaterial color="#252525" metalness={0.55} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ============================================================================
// CYLINDER HEADS (Cast Iron - Chevy 350 Vortec Style)
// 64cc combustion chambers, 1.94" intake / 1.50" exhaust valves
// Heart-shaped (bathtub) combustion chamber design
// 17 head bolts per head, 8 rocker studs per head
// ============================================================================
function CylinderHead({ bankSide, debugMode, xrayMode = false }: { bankSide: 1 | -1; debugMode: boolean; xrayMode?: boolean }) {
  const boreRadius = BORE / 2;
  const intakeValveRadius = VALVES_SCALED.INTAKE_HEAD_RADIUS;
  const exhaustValveRadius = VALVES_SCALED.EXHAUST_HEAD_RADIUS;
  const valveGuideOD = VALVE_GUIDES_SCALED.OUTSIDE_RADIUS;
  const valveGuideProtrusion = VALVE_GUIDES_SCALED.PROTRUSION;
  const headHeight = 0.12;
  const deckSurfaceY = 0.65;
  const headBoltBossRadius = CYLINDER_HEADS_SCALED.HEAD_BOLT_BOSS_OD / 2;
  const rockerStudRadius = CYLINDER_HEADS_SCALED.ROCKER_STUD_DIAMETER / 2;
  const intakePortWidth = CYLINDER_HEADS_SCALED.INTAKE_PORT_WIDTH;
  const intakePortHeight = CYLINDER_HEADS_SCALED.INTAKE_PORT_HEIGHT;
  const exhaustPortWidth = CYLINDER_HEADS_SCALED.EXHAUST_PORT_WIDTH;
  const exhaustPortHeight = CYLINDER_HEADS_SCALED.EXHAUST_PORT_HEIGHT;
  
  const headBoltPositions = useMemo(() => {
    const positions: { x: number; z: number }[] = [];
    const bankZOffset = bankSide === -1 ? BANK_OFFSET : 0;
    for (let i = 0; i < 4; i++) {
      const zPos = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + bankZOffset;
      positions.push({ x: bankSide * 0.12, z: zPos - boreRadius * 0.7 });
      positions.push({ x: bankSide * 0.12, z: zPos + boreRadius * 0.7 });
      positions.push({ x: bankSide * 0.30, z: zPos - boreRadius * 0.7 });
      positions.push({ x: bankSide * 0.30, z: zPos + boreRadius * 0.7 });
    }
    positions.push({ x: bankSide * 0.22, z: FIRST_CYLINDER_Z - CYLINDER_SPACING * 0.6 + bankZOffset });
    return positions;
  }, [bankSide, boreRadius]);
  
  return (
    <group rotation={[0, 0, bankSide * BANK_ANGLE]}>
      {/* Main head casting - cast iron */}
      <mesh position={[bankSide * 0.22, deckSurfaceY + headHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.22, headHeight, BLOCK_LENGTH * 0.90]} />
        <meshStandardMaterial 
          color={xrayMode ? "#3a3a3a" : "#252525"} 
          metalness={xrayMode ? 0.88 : 0.5} 
          roughness={xrayMode ? 0.15 : 0.6}
          transparent={xrayMode}
          opacity={xrayMode ? 0.25 : 1}
          depthWrite={!xrayMode}
          side={xrayMode ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>
      
      {/* Head gasket surface (machined) */}
      <mesh position={[bankSide * 0.22, deckSurfaceY, 0]} castShadow>
        <boxGeometry args={[0.21, 0.006, BLOCK_LENGTH * 0.88]} />
        <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Head bolt bosses (17 per head - SBC pattern) */}
      {headBoltPositions.map((pos, idx) => (
        <group key={`head-bolt-boss-${idx}`}>
          <mesh position={[pos.x, deckSurfaceY + 0.003, pos.z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[headBoltBossRadius, headBoltBossRadius * 0.9, 0.006, 12]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[pos.x, deckSurfaceY + headHeight, pos.z]} castShadow>
            <cylinderGeometry args={[CYLINDER_HEADS_SCALED.HEAD_BOLT_DIAMETER / 2, CYLINDER_HEADS_SCALED.HEAD_BOLT_DIAMETER / 2, 0.015, 8]} />
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      
      {/* Per-cylinder features */}
      {[0, 1, 2, 3].map((i) => {
        const bankZOffset = bankSide === -1 ? BANK_OFFSET : 0;
        const zPos = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + bankZOffset;
        const intakeValveX = bankSide * 0.18;
        const exhaustValveX = bankSide * 0.26;
        const intakeValveZ = zPos + boreRadius * 0.35;
        const exhaustValveZ = zPos - boreRadius * 0.35;
        
        return (
          <group key={`head-cyl-${i}`}>
            {/* === COMBUSTION CHAMBER (64cc Vortec - Heart/Bathtub shaped) === */}
            <mesh position={[bankSide * 0.20, deckSurfaceY + 0.012, zPos]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[boreRadius * 0.82, boreRadius * 0.72, 0.024, 24]} />
              <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
            </mesh>
            <mesh position={[bankSide * 0.18, deckSurfaceY + 0.018, zPos + boreRadius * 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <capsuleGeometry args={[boreRadius * 0.35, boreRadius * 0.4, 8, 16]} />
              <meshStandardMaterial color="#0f0f0f" metalness={0.25} roughness={0.85} />
            </mesh>
            <mesh position={[bankSide * 0.24, deckSurfaceY + 0.018, zPos - boreRadius * 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <capsuleGeometry args={[boreRadius * 0.28, boreRadius * 0.3, 8, 16]} />
              <meshStandardMaterial color="#0f0f0f" metalness={0.25} roughness={0.85} />
            </mesh>
            <mesh position={[bankSide * 0.20, deckSurfaceY + 0.004, zPos]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[boreRadius * 0.78, 0.012, 12, 32]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
            </mesh>
            
            {/* === VALVE GUIDES (8 per head - 0.500" OD) === */}
            <mesh position={[intakeValveX, deckSurfaceY + headHeight * 0.5 + valveGuideProtrusion * 0.5, intakeValveZ]} castShadow>
              <cylinderGeometry args={[valveGuideOD, valveGuideOD, valveGuideProtrusion, 16]} />
              <meshStandardMaterial color="#404040" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[intakeValveX, deckSurfaceY + headHeight * 0.5 + valveGuideProtrusion, intakeValveZ]} castShadow>
              <cylinderGeometry args={[valveGuideOD * 0.8, valveGuideOD * 0.6, 0.01, 12]} />
              <meshStandardMaterial color="#353535" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[exhaustValveX, deckSurfaceY + headHeight * 0.5 + valveGuideProtrusion * 0.5, exhaustValveZ]} castShadow>
              <cylinderGeometry args={[valveGuideOD, valveGuideOD, valveGuideProtrusion, 16]} />
              <meshStandardMaterial color="#404040" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[exhaustValveX, deckSurfaceY + headHeight * 0.5 + valveGuideProtrusion, exhaustValveZ]} castShadow>
              <cylinderGeometry args={[valveGuideOD * 0.8, valveGuideOD * 0.6, 0.01, 12]} />
              <meshStandardMaterial color="#353535" metalness={0.6} roughness={0.4} />
            </mesh>
            
            {/* Intake valve seat (hardened steel insert - 45° angle) */}
            <mesh position={[intakeValveX, deckSurfaceY + 0.005, intakeValveZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[intakeValveRadius, 0.008, 12, 24]} />
              <meshStandardMaterial color="#555" metalness={0.85} roughness={0.15} />
            </mesh>
            
            {/* Exhaust valve seat (hardened steel insert - 45° angle) */}
            <mesh position={[exhaustValveX, deckSurfaceY + 0.005, exhaustValveZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[exhaustValveRadius, 0.007, 12, 24]} />
              <meshStandardMaterial color="#555" metalness={0.85} roughness={0.15} />
            </mesh>
            
            {/* === INTAKE PORT RUNNER (Rectangular ~1.94" × 2.0") === */}
            <mesh position={[bankSide * 0.32, deckSurfaceY + headHeight * 0.55, intakeValveZ]} 
                  rotation={[0, 0, bankSide * 0.15]} castShadow>
              <boxGeometry args={[0.06, intakePortHeight * 0.4, intakePortWidth * 0.5]} />
              <meshStandardMaterial color="#0d0d0d" metalness={0.25} roughness={0.85} />
            </mesh>
            <mesh position={[bankSide * 0.28, deckSurfaceY + headHeight * 0.35, intakeValveZ]} 
                  rotation={[0, 0, bankSide * 0.1]} castShadow>
              <boxGeometry args={[0.04, intakePortHeight * 0.35, intakePortWidth * 0.45]} />
              <meshStandardMaterial color="#0a0a0a" metalness={0.2} roughness={0.9} />
            </mesh>
            
            {/* === EXHAUST PORT RUNNER (Rectangular ~1.50" × 1.6") === */}
            <mesh position={[bankSide * 0.34, deckSurfaceY + headHeight * 0.5, exhaustValveZ]} 
                  rotation={[0, 0, bankSide * 0.2]} castShadow>
              <boxGeometry args={[0.05, exhaustPortHeight * 0.35, exhaustPortWidth * 0.5]} />
              <meshStandardMaterial color="#0d0d0d" metalness={0.25} roughness={0.85} />
            </mesh>
            <mesh position={[bankSide * 0.30, deckSurfaceY + headHeight * 0.32, exhaustValveZ]} 
                  rotation={[0, 0, bankSide * 0.12]} castShadow>
              <boxGeometry args={[0.035, exhaustPortHeight * 0.3, exhaustPortWidth * 0.45]} />
              <meshStandardMaterial color="#0a0a0a" metalness={0.2} roughness={0.9} />
            </mesh>
            
            {/* Spark plug boss (14mm thread) */}
            <mesh position={[bankSide * 0.22, deckSurfaceY + headHeight, zPos]} castShadow>
              <cylinderGeometry args={[0.018, 0.022, 0.04, 12]} />
              <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[bankSide * 0.22, deckSurfaceY + headHeight + 0.025, zPos]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.015, 12]} />
              <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
            </mesh>
            
            {/* === ROCKER ARM STUD BOSSES (2 per cylinder = 8 per head, 7/16" studs) === */}
            <mesh position={[bankSide * 0.17, deckSurfaceY + headHeight, intakeValveZ]} castShadow>
              <cylinderGeometry args={[rockerStudRadius * 1.6, rockerStudRadius * 1.8, 0.025, 12]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.55} roughness={0.45} />
            </mesh>
            <mesh position={[bankSide * 0.17, deckSurfaceY + headHeight + 0.025, intakeValveZ]} castShadow>
              <cylinderGeometry args={[rockerStudRadius, rockerStudRadius, 0.035, 8]} />
              <meshStandardMaterial color="#404040" metalness={0.75} roughness={0.25} />
            </mesh>
            <mesh position={[bankSide * 0.27, deckSurfaceY + headHeight, exhaustValveZ]} castShadow>
              <cylinderGeometry args={[rockerStudRadius * 1.6, rockerStudRadius * 1.8, 0.025, 12]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.55} roughness={0.45} />
            </mesh>
            <mesh position={[bankSide * 0.27, deckSurfaceY + headHeight + 0.025, exhaustValveZ]} castShadow>
              <cylinderGeometry args={[rockerStudRadius, rockerStudRadius, 0.035, 8]} />
              <meshStandardMaterial color="#404040" metalness={0.75} roughness={0.25} />
            </mesh>
          </group>
        );
      })}
      
      {/* Valve cover rail */}
      <mesh position={[bankSide * 0.22, deckSurfaceY + headHeight + 0.02, 0]} castShadow>
        <boxGeometry args={[0.20, 0.04, BLOCK_LENGTH * 0.88]} />
        <meshStandardMaterial 
          color={xrayMode ? "#3a3a3a" : "#1d1d1d"} 
          metalness={xrayMode ? 0.88 : 0.5} 
          roughness={xrayMode ? 0.15 : 0.55}
          transparent={xrayMode}
          opacity={xrayMode ? 0.25 : 1}
          depthWrite={!xrayMode}
          side={xrayMode ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>
      
      {/* Valve cover (stamped steel) */}
      <mesh position={[bankSide * 0.22, deckSurfaceY + headHeight + 0.08, 0]} castShadow>
        <boxGeometry args={[0.18, 0.08, BLOCK_LENGTH * 0.85]} />
        <meshStandardMaterial 
          color={xrayMode ? "#3a3a3a" : "#2a2a2a"} 
          metalness={xrayMode ? 0.88 : 0.65} 
          roughness={xrayMode ? 0.15 : 0.4}
          transparent={xrayMode}
          opacity={xrayMode ? 0.25 : 1}
          depthWrite={!xrayMode}
          side={xrayMode ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>
      
      {/* Valve cover breather */}
      <mesh position={[bankSide * 0.22, deckSurfaceY + headHeight + 0.14, 0.15]} castShadow>
        <cylinderGeometry args={[0.02, 0.022, 0.04, 16]} />
        <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Oil fill cap (driver side only) */}
      {bankSide === -1 && (
        <mesh position={[bankSide * 0.22, deckSurfaceY + headHeight + 0.14, -0.2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.035, 16]} />
          <meshStandardMaterial color="#111" metalness={0.7} roughness={0.35} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// CAMSHAFT WITH LOBES
// ============================================================================
function Camshaft({ engineRef, debugMode }: { engineRef: React.MutableRefObject<{ crankAngle: number }>; debugMode: boolean }) {
  const camRef = useRef<THREE.Group>(null);
  const camRadius = CAM_BASE_CIRCLE / 2;
  
  // CAM ROTATES AT EXACTLY 1/2 CRANK SPEED (4-stroke cycle constraint)
  // Timing chain enforces 18:36 tooth ratio = 2:1 crank:cam
  // This is a hard mechanical constraint - cam CANNOT rotate at any other speed
  useFrame(() => {
    if (camRef.current) {
      camRef.current.rotation.z = engineRef.current.crankAngle * 0.5;
    }
  });

  // Cam lobe positions (8 cylinders x 2 valves = 16 lobes)
  // Lobes are arranged with proper firing order timing
  const camLobes = useMemo(() => {
    const lobes: { z: number; intakePhase: number; exhaustPhase: number }[] = [];
    // Right bank cylinders 1,3,5,7 then left bank 2,4,6,8
    const firingOrder = [1, 8, 4, 3, 6, 5, 7, 2];
    
    for (let i = 0; i < 4; i++) {
      const zPos = FIRST_CYLINDER_Z + i * CYLINDER_SPACING;
      // Calculate lobe phase based on firing order position
      const rightCyl = i * 2 + 1;
      const leftCyl = i * 2 + 2;
      
      const rightFiringIndex = firingOrder.indexOf(rightCyl);
      const leftFiringIndex = firingOrder.indexOf(leftCyl);
      
      // Phase offset: 720° / 8 cylinders = 90° between firing events
      const rightPhase = (rightFiringIndex * Math.PI / 4);
      const leftPhase = (leftFiringIndex * Math.PI / 4);
      
      lobes.push({
        z: zPos - CYLINDER_SPACING * 0.1, // Intake lobe (front)
        intakePhase: rightPhase + Math.PI,  // Intake opens during intake stroke
        exhaustPhase: rightPhase,            // Exhaust lobe for right bank
      });
      lobes.push({
        z: zPos + CYLINDER_SPACING * 0.1, // Exhaust lobe (rear)
        intakePhase: leftPhase + Math.PI,
        exhaustPhase: leftPhase,
      });
    }
    return lobes;
  }, []);

  return (
    <group ref={camRef} position={[0, CAMSHAFT_SCALED.HEIGHT_FROM_CRANK, 0]}>
      {/* Main cam shaft journal */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[camRadius * 0.8, camRadius * 0.8, BLOCK_LENGTH * 0.85, 24]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.95} roughness={0.08} />
      </mesh>
      
      {/* Cam bearing journals (5 bearings) */}
      {MAIN_BEARING_POSITIONS.map((zPos, i) => (
        <mesh key={`cam-bearing-${i}`} position={[0, 0, zPos * 0.95]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[camRadius * 0.85, camRadius * 0.85, 0.04, 20]} />
          <meshStandardMaterial color="#505050" metalness={0.97} roughness={0.04} />
        </mesh>
      ))}

      {/* Cam lobes for all 16 valves (2 per cylinder) */}
      {[0, 1, 2, 3].map((cylIndex) => {
        const zPos = FIRST_CYLINDER_Z + cylIndex * CYLINDER_SPACING;
        
        return (
          <group key={`cam-lobes-${cylIndex}`}>
            {/* Intake lobe - right bank (offset for lobe separation) */}
            <group position={[0, 0, zPos - 0.02]} rotation={[0, 0, cylIndex * (Math.PI / 4)]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[camRadius, camRadius, 0.025, 20]} />
                <meshStandardMaterial color="#606060" metalness={0.9} roughness={0.15} />
              </mesh>
              {/* Lobe nose (eccentric) */}
              <mesh position={[0, camRadius * 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[camRadius * 0.5, CAM_LOBE_LIFT, 8, 12]} />
                <meshStandardMaterial color="#555" metalness={0.92} roughness={0.12} />
              </mesh>
            </group>
            
            {/* Exhaust lobe - right bank (108° lobe separation typical) */}
            <group position={[0, 0, zPos + 0.02]} rotation={[0, 0, cylIndex * (Math.PI / 4) + (108 * Math.PI / 180)]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[camRadius, camRadius, 0.025, 20]} />
                <meshStandardMaterial color="#606060" metalness={0.9} roughness={0.15} />
              </mesh>
              <mesh position={[0, camRadius * 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[camRadius * 0.5, CAM_LOBE_LIFT, 8, 12]} />
                <meshStandardMaterial color="#555" metalness={0.92} roughness={0.12} />
              </mesh>
            </group>
            
            {/* Intake lobe - left bank (with BANK_OFFSET for forward position) */}
            <group position={[0, 0, zPos - 0.05 + BANK_OFFSET]} rotation={[0, 0, (cylIndex + 0.5) * (Math.PI / 4)]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[camRadius, camRadius, 0.025, 20]} />
                <meshStandardMaterial color="#606060" metalness={0.9} roughness={0.15} />
              </mesh>
              <mesh position={[0, camRadius * 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[camRadius * 0.5, CAM_LOBE_LIFT, 8, 12]} />
                <meshStandardMaterial color="#555" metalness={0.92} roughness={0.12} />
              </mesh>
            </group>
            
            {/* Exhaust lobe - left bank (with BANK_OFFSET for forward position) */}
            <group position={[0, 0, zPos + 0.05 + BANK_OFFSET]} rotation={[0, 0, (cylIndex + 0.5) * (Math.PI / 4) + (108 * Math.PI / 180)]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[camRadius, camRadius, 0.025, 20]} />
                <meshStandardMaterial color="#606060" metalness={0.9} roughness={0.15} />
              </mesh>
              <mesh position={[0, camRadius * 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[camRadius * 0.5, CAM_LOBE_LIFT, 8, 12]} />
                <meshStandardMaterial color="#555" metalness={0.92} roughness={0.12} />
              </mesh>
            </group>
          </group>
        );
      })}
      
      {/* Cam sprocket mounting flange (front) */}
      <mesh position={[0, 0, BLOCK_LENGTH / 2 - 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[camRadius * 1.5, camRadius * 1.5, 0.025, 20]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.88} roughness={0.2} />
      </mesh>
      
      {/* Distributor gear (rear) */}
      <mesh position={[0, 0, -BLOCK_LENGTH / 2 + 0.15]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[camRadius * 1.3, camRadius * 1.3, 0.035, 24]} />
        <meshStandardMaterial color="#404040" metalness={0.85} roughness={0.25} />
      </mesh>
      
      {/* Distributor gear teeth */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh 
            key={`dist-gear-${i}`} 
            position={[
              Math.cos(angle) * camRadius * 1.35,
              Math.sin(angle) * camRadius * 1.35,
              -BLOCK_LENGTH / 2 + 0.15
            ]} 
            rotation={[Math.PI / 2, 0, angle]}
            castShadow
          >
            <boxGeometry args={[0.012, 0.015, 0.03]} />
            <meshStandardMaterial color="#353535" metalness={0.8} roughness={0.3} />
          </mesh>
        );
      })}
      
      {debugMode && (
        <DebugSphere position={[0, 0, 0]} color="#ff00ff" size={0.015} />
      )}
    </group>
  );
}

// ============================================================================
// TIMING CHAIN AND SPROCKETS
// ============================================================================
function TimingChainSystem({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const crankSprocketRef = useRef<THREE.Group>(null);
  const camSprocketRef = useRef<THREE.Group>(null);
  
  const crankSprocketRadius = 0.045;
  const camSprocketRadius = 0.09; // 2x crank for 2:1 ratio
  const chainZ = BLOCK_LENGTH / 2 - 0.02;
  // Camshaft Y position from authentic SBC 350 specs: 4.521" from crank centerline
  const camY = CAMSHAFT_SCALED.HEIGHT_FROM_CRANK; // 0.389 units
  
  useFrame(() => {
    if (crankSprocketRef.current) {
      crankSprocketRef.current.rotation.z = engineRef.current.crankAngle;
    }
    if (camSprocketRef.current) {
      camSprocketRef.current.rotation.z = engineRef.current.crankAngle * 0.5;
    }
  });

  // Create chain path points
  const chainPoints = useMemo(() => {
    const points: [number, number][] = [];
    const segments = 24;
    
    // Bottom arc around crank sprocket
    for (let i = 0; i <= segments / 2; i++) {
      const angle = Math.PI + (i / (segments / 2)) * Math.PI;
      points.push([
        Math.cos(angle) * crankSprocketRadius,
        CRANKSHAFT_Y + Math.sin(angle) * crankSprocketRadius
      ]);
    }
    
    // Top arc around cam sprocket
    for (let i = 0; i <= segments / 2; i++) {
      const angle = (i / (segments / 2)) * Math.PI;
      points.push([
        Math.cos(angle) * camSprocketRadius,
        camY + Math.sin(angle) * camSprocketRadius
      ]);
    }
    
    return points;
  }, []);

  return (
    <group position={[0, 0, chainZ]}>
      {/* Crank timing sprocket */}
      <group ref={crankSprocketRef} position={[0, CRANKSHAFT_Y, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[crankSprocketRadius, crankSprocketRadius, 0.02, 24]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Sprocket teeth */}
        {Array.from({ length: CRANK_SPROCKET_TEETH }).map((_, i) => {
          const angle = (i / CRANK_SPROCKET_TEETH) * Math.PI * 2;
          return (
            <mesh 
              key={`crank-tooth-${i}`}
              position={[Math.cos(angle) * (crankSprocketRadius + 0.008), Math.sin(angle) * (crankSprocketRadius + 0.008), 0]}
              rotation={[Math.PI / 2, 0, angle]}
              castShadow
            >
              <boxGeometry args={[0.008, 0.012, 0.018]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.25} />
            </mesh>
          );
        })}
        {/* Timing mark */}
        <mesh position={[crankSprocketRadius + 0.012, 0, 0]} castShadow>
          <boxGeometry args={[0.006, 0.003, 0.022]} />
          <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.6} />
        </mesh>
      </group>
      
      {/* Cam timing sprocket */}
      <group ref={camSprocketRef} position={[0, camY, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[camSprocketRadius, camSprocketRadius, 0.02, 36]} />
          <meshStandardMaterial color="#404040" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Sprocket teeth */}
        {Array.from({ length: CAM_SPROCKET_TEETH }).map((_, i) => {
          const angle = (i / CAM_SPROCKET_TEETH) * Math.PI * 2;
          return (
            <mesh 
              key={`cam-tooth-${i}`}
              position={[Math.cos(angle) * (camSprocketRadius + 0.008), Math.sin(angle) * (camSprocketRadius + 0.008), 0]}
              rotation={[Math.PI / 2, 0, angle]}
              castShadow
            >
              <boxGeometry args={[0.008, 0.012, 0.018]} />
              <meshStandardMaterial color="#333" metalness={0.8} roughness={0.25} />
            </mesh>
          );
        })}
        {/* Dowel pin */}
        <mesh position={[camSprocketRadius * 0.6, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.02, 8]} />
          <meshStandardMaterial color="#555" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
      
      {/* Timing chain (simplified as line segments) */}
      {chainPoints.map((point, i) => {
        const nextPoint = chainPoints[(i + 1) % chainPoints.length];
        const midX = (point[0] + nextPoint[0]) / 2;
        const midY = (point[1] + nextPoint[1]) / 2;
        const dx = nextPoint[0] - point[0];
        const dy = nextPoint[1] - point[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        return (
          <mesh key={`chain-${i}`} position={[midX, midY, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
            <boxGeometry args={[0.012, length, 0.015]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// TIMING COVER - Cast aluminum cover for timing chain
// SBC 350 authentic: Covers chain/gears, water pump mount, crank seal boss
// ============================================================================
function TimingCover() {
  const coverZ = BLOCK_LENGTH / 2 + 0.025;
  const camY = CAMSHAFT_SCALED.HEIGHT_FROM_CRANK;
  
  return (
    <group position={[0, 0, coverZ]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <boxGeometry args={[0.38, 0.015, 0.52]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.7} roughness={0.35} />
      </mesh>
      
      <mesh position={[0, camY / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <boxGeometry args={[0.32, 0.018, camY + 0.15]} />
        <meshStandardMaterial color="#989898" metalness={0.65} roughness={0.4} />
      </mesh>
      
      <mesh position={[0, CRANKSHAFT_Y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.025, 32]} />
        <meshStandardMaterial color="#707070" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, CRANKSHAFT_Y, 0.008]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.055, 0.008, 12, 32]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
      </mesh>
      
      <mesh position={[0, camY + 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 24]} />
        <meshStandardMaterial color="#909090" metalness={0.6} roughness={0.4} />
      </mesh>
      
      <mesh position={[0.12, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.025, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.5} />
      </mesh>
      
      {[[-0.14, 0.22], [0.14, 0.22], [-0.14, -0.08], [0.14, -0.08], [-0.08, 0.4], [0.08, 0.4]].map(([x, y], i) => (
        <mesh key={`cover-bolt-${i}`} position={[x, y, 0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.012, 6]} />
          <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// WATER PUMP - Centrifugal pump mounted on timing cover front
// SBC 350 authentic: Cast iron housing, impeller, inlet/outlet, bypass
// ============================================================================
function WaterPump({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const pumpRef = useRef<THREE.Group>(null);
  const pulleyZ = BLOCK_LENGTH / 2 + 0.1;
  const pumpY = 0.4;
  
  useFrame(() => {
    if (pumpRef.current) {
      pumpRef.current.rotation.z = engineRef.current.crankAngle;
    }
  });
  
  return (
    <group position={[0, pumpY, pulleyZ - 0.02]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.075, 0.06, 24]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.5} />
      </mesh>
      
      <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.04, 20]} />
        <meshStandardMaterial color="#404040" metalness={0.55} roughness={0.55} />
      </mesh>
      
      <mesh position={[0, 0.08, -0.01]} rotation={[0.3, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.06, 16]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.6} />
      </mesh>
      
      <mesh position={[0.08, 0, -0.01]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.05, 12]} />
        <meshStandardMaterial color="#454545" metalness={0.5} roughness={0.55} />
      </mesh>
      
      <mesh position={[-0.06, 0.04, -0.01]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
        <meshStandardMaterial color="#505050" metalness={0.45} roughness={0.6} />
      </mesh>
      
      <group ref={pumpRef} position={[0, 0, 0.05]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.065, 0.035, 24]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.055, 0.008, 8, 24]} />
          <meshStandardMaterial color="#111" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.045, 16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={`pump-bolt-${i}`} position={[Math.cos(angle) * 0.065, Math.sin(angle) * 0.065, 0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.006, 0.006, 0.015, 6]} />
            <meshStandardMaterial color="#555" metalness={0.8} roughness={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// OIL PAN WITH REAR SUMP - Stock SBC 350 design
// Authentic: Stamped steel, rear sump, drain plug, windage tray rails
// ============================================================================
function OilPan() {
  const panDepth = toUnits(5.5);
  const sumpDepth = toUnits(3.5);
  const panLength = BLOCK_LENGTH * 0.95;
  const panWidth = toUnits(9);
  const sumpWidth = toUnits(5);
  const panY = CRANKSHAFT_Y - toUnits(2);
  
  return (
    <group position={[0, panY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[panWidth, panDepth * 0.4, panLength]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.45} />
      </mesh>
      
      <mesh position={[0, -panDepth * 0.2 - sumpDepth * 0.35, -panLength * 0.25]} castShadow>
        <boxGeometry args={[sumpWidth, sumpDepth * 0.7, panLength * 0.55]} />
        <meshStandardMaterial color="#252525" metalness={0.55} roughness={0.5} />
      </mesh>
      
      <mesh position={[0, -panDepth * 0.2 - sumpDepth * 0.35 - 0.04, -panLength * 0.25 + panLength * 0.275]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[sumpWidth, sumpDepth * 0.3, panLength * 0.15]} />
        <meshStandardMaterial color="#282828" metalness={0.55} roughness={0.5} />
      </mesh>
      
      {[-1, 1].map((side) => (
        <group key={`rail-${side}`}>
          <mesh position={[side * (panWidth / 2 + 0.01), panDepth * 0.2 + 0.005, 0]} castShadow>
            <boxGeometry args={[0.02, 0.012, panLength]} />
            <meshStandardMaterial color="#333" metalness={0.7} roughness={0.35} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => {
            const zPos = -panLength / 2 + 0.06 + i * (panLength / 8);
            return (
              <mesh key={`rail-bolt-${side}-${i}`} position={[side * (panWidth / 2 + 0.01), panDepth * 0.2 + 0.015, zPos]} castShadow>
                <cylinderGeometry args={[0.005, 0.005, 0.008, 6]} />
                <meshStandardMaterial color="#555" metalness={0.8} roughness={0.25} />
              </mesh>
            );
          })}
        </group>
      ))}
      
      <group position={[0, -panDepth * 0.2 - sumpDepth * 0.7 - 0.02, -panLength * 0.4]}>
        <mesh rotation={[0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.015, 0.025, 12]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.75} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.015, 0.008]} rotation={[0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.008, 6]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
      
      <mesh position={[0.06, -panDepth * 0.15, -panLength * 0.35]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 12]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.45} />
      </mesh>
    </group>
  );
}

// ============================================================================
// OIL PUMP AND PICKUP - Internal gear pump driven by distributor
// SBC 350 authentic: Mounted in pan, pickup screen in sump, tube to pump
// ============================================================================
function OilPump() {
  const panY = CRANKSHAFT_Y - toUnits(2);
  const sumpY = panY - toUnits(4);
  const sumpZ = -BLOCK_LENGTH * 0.25;
  
  return (
    <group>
      <group position={[0.06, panY - 0.02, sumpZ]}>
        <mesh castShadow>
          <boxGeometry args={[0.06, 0.05, 0.08]} />
          <meshStandardMaterial color="#404040" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.01, 0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.025, 12]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.65} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.035, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
          <meshStandardMaterial color="#555" metalness={0.75} roughness={0.3} />
        </mesh>
        <mesh position={[-0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.025, 12]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.65} roughness={0.4} />
        </mesh>
      </group>
      
      <group position={[0.06, sumpY + 0.03, sumpZ - 0.08]}>
        <mesh position={[0, 0, 0.06]} rotation={[0.2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
          <meshStandardMaterial color="#505050" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.025, 16]} />
          <meshStandardMaterial color="#454545" metalness={0.6} roughness={0.45} />
        </mesh>
        <mesh position={[0, -0.008, 0]} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 0.008, 24, 1, true]} />
          <meshStandardMaterial color="#333" metalness={0.4} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.015, 0]} castShadow>
          <ringGeometry args={[0.008, 0.035, 16]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const r = 0.025;
          return (
            <mesh key={`screen-${i}`} position={[Math.cos(angle) * r, -0.015, Math.sin(angle) * r]} rotation={[Math.PI / 2, angle, 0]} castShadow>
              <boxGeometry args={[0.002, 0.018, 0.001]} />
              <meshStandardMaterial color="#444" metalness={0.5} roughness={0.5} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ============================================================================
// HYDRAULIC LIFTERS
// ============================================================================
function HydraulicLifters({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const lifterRadius = LIFTER_DIA / 2;
  
  // 16 lifters total (2 per cylinder)
  const lifterConfigs = useMemo(() => {
    const configs: { z: number; xOffset: number; phase: number }[] = [];
    
    for (let i = 0; i < 4; i++) {
      const zPosRight = FIRST_CYLINDER_Z + i * CYLINDER_SPACING;
      const zPosLeft = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + BANK_OFFSET;
      // Intake and exhaust lifters per cylinder, both banks
      // Slight X offset for V arrangement
      configs.push({ z: zPosRight - 0.02, xOffset: 0.04, phase: i * (Math.PI / 4) }); // Right intake
      configs.push({ z: zPosRight + 0.02, xOffset: 0.04, phase: i * (Math.PI / 4) + (108 * Math.PI / 180) }); // Right exhaust
      configs.push({ z: zPosLeft - 0.02, xOffset: -0.04, phase: (i + 0.5) * (Math.PI / 4) }); // Left intake
      configs.push({ z: zPosLeft + 0.02, xOffset: -0.04, phase: (i + 0.5) * (Math.PI / 4) + (108 * Math.PI / 180) }); // Left exhaust
    }
    return configs;
  }, []);

  return (
    <group position={[0, 0.32, 0]}>
      {lifterConfigs.map((config, i) => (
        <LifterUnit 
          key={`lifter-${i}`} 
          position={[config.xOffset, 0, config.z]} 
          engineRef={engineRef}
          phase={config.phase}
        />
      ))}
    </group>
  );
}

function LifterUnit({ 
  position, 
  engineRef, 
  phase 
}: { 
  position: [number, number, number]; 
  engineRef: React.MutableRefObject<{ crankAngle: number }>;
  phase: number;
}) {
  const lifterRef = useRef<THREE.Mesh>(null);
  const lifterRadius = LIFTER_DIA / 2;
  
  useFrame(() => {
    if (lifterRef.current) {
      // Lifter rides on cam lobe - cam rotates at exactly 1/2 crank speed
      const camAngle = engineRef.current.crankAngle * 0.5 + phase;
      const liftFactor = Math.max(0, Math.cos(camAngle));
      // Clamp lift to CAM_LOBE_LIFT max (lifter cannot exceed cam profile)
      const clampedLift = Math.min(liftFactor * CAM_LOBE_LIFT, CAM_LOBE_LIFT);
      // Lifter translates ONLY on Y axis (vertical in lifter bore)
      lifterRef.current.position.y = clampedLift;
    }
  });

  // Use authentic lifter dimensions from SBC 350 specs
  const lifterHeight = LIFTERS_SCALED.OVERALL_HEIGHT; // 2.0" = 0.172 units
  
  return (
    <group position={position}>
      {/* Hydraulic lifter body - authentic 0.842" OD x 2.0" height */}
      <mesh ref={lifterRef} castShadow>
        <cylinderGeometry args={[lifterRadius, lifterRadius, lifterHeight, 16]} />
        <meshStandardMaterial color="#505050" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Lifter crown (pushrod seat) */}
      <mesh ref={lifterRef} position={[0, lifterHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[lifterRadius * 0.7, lifterRadius * 0.85, 0.01, 16]} />
        <meshStandardMaterial color="#606060" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Lifter bore in block */}
      <mesh position={[0, -lifterHeight * 0.3, 0]} castShadow>
        <cylinderGeometry args={[lifterRadius + 0.003, lifterRadius + 0.003, lifterHeight * 0.8, 16, 1, true]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.4} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ============================================================================
// PUSHRODS (16 total)
// ============================================================================
function Pushrods({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const pushrodConfigs = useMemo(() => {
    const configs: { startPos: [number, number, number]; bankSide: number; phase: number }[] = [];
    
    for (let i = 0; i < 4; i++) {
      const zPosRight = FIRST_CYLINDER_Z + i * CYLINDER_SPACING;
      const zPosLeft = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + BANK_OFFSET;
      // Right bank pushrods
      configs.push({ startPos: [0.04, 0.38, zPosRight - 0.02], bankSide: 1, phase: i * (Math.PI / 4) });
      configs.push({ startPos: [0.04, 0.38, zPosRight + 0.02], bankSide: 1, phase: i * (Math.PI / 4) + (108 * Math.PI / 180) });
      // Left bank pushrods
      configs.push({ startPos: [-0.04, 0.38, zPosLeft - 0.02], bankSide: -1, phase: (i + 0.5) * (Math.PI / 4) });
      configs.push({ startPos: [-0.04, 0.38, zPosLeft + 0.02], bankSide: -1, phase: (i + 0.5) * (Math.PI / 4) + (108 * Math.PI / 180) });
    }
    return configs;
  }, []);

  return (
    <group>
      {pushrodConfigs.map((config, i) => (
        <PushrodUnit 
          key={`pushrod-${i}`} 
          startPos={config.startPos} 
          bankSide={config.bankSide}
          engineRef={engineRef}
          phase={config.phase}
        />
      ))}
    </group>
  );
}

function PushrodUnit({ 
  startPos, 
  bankSide,
  engineRef,
  phase
}: { 
  startPos: [number, number, number]; 
  bankSide: number;
  engineRef: React.MutableRefObject<{ crankAngle: number }>;
  phase: number;
}) {
  const pushrodRef = useRef<THREE.Group>(null);
  const pushrodRadius = PUSHROD_DIA / 2;
  
  // Calculate pushrod end position (at rocker)
  const bankAngle = bankSide * BANK_ANGLE;
  const rockerY = 0.65;
  const rockerX = bankSide * 0.15;
  
  useFrame(() => {
    if (pushrodRef.current) {
      // Pushrod transmits motion from lifter to rocker - driven by cam at 1/2 crank speed
      const camAngle = engineRef.current.crankAngle * 0.5 + phase;
      const liftFactor = Math.max(0, Math.cos(camAngle));
      // Clamp pushrod motion to cam lobe lift (cannot exceed lifter travel)
      const clampedLift = Math.min(liftFactor * CAM_LOBE_LIFT, CAM_LOBE_LIFT);
      // Pushrod translates with lifter - SAME AMOUNT as lifter (mechanically linked)
      pushrodRef.current.position.y = clampedLift;
    }
  });

  // Calculate pushrod geometry
  const dx = rockerX - startPos[0];
  const dy = rockerY - startPos[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dx, dy);

  return (
    <group ref={pushrodRef} position={startPos}>
      <mesh 
        position={[dx / 2, dy / 2, 0]} 
        rotation={[0, 0, -angle]}
        castShadow
      >
        <cylinderGeometry args={[pushrodRadius, pushrodRadius, length, 8]} />
        <meshStandardMaterial color="#808080" metalness={0.9} roughness={0.12} />
      </mesh>
      {/* Ball ends */}
      <mesh castShadow>
        <sphereGeometry args={[pushrodRadius * 1.3, 8, 8]} />
        <meshStandardMaterial color="#707070" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[dx, dy, 0]} castShadow>
        <sphereGeometry args={[pushrodRadius * 1.3, 8, 8]} />
        <meshStandardMaterial color="#707070" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ============================================================================
// ROCKER ARMS
// ============================================================================
function RockerArms({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const rockerConfigs = useMemo(() => {
    const configs: { position: [number, number, number]; bankSide: number; phase: number; isIntake: boolean }[] = [];
    
    for (let i = 0; i < 4; i++) {
      const zPosRight = FIRST_CYLINDER_Z + i * CYLINDER_SPACING;
      const zPosLeft = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + BANK_OFFSET;
      // Right bank rockers
      configs.push({ position: [0.18, 0.68, zPosRight - 0.03], bankSide: 1, phase: i * (Math.PI / 4), isIntake: true });
      configs.push({ position: [0.18, 0.68, zPosRight + 0.03], bankSide: 1, phase: i * (Math.PI / 4) + (108 * Math.PI / 180), isIntake: false });
      // Left bank rockers
      configs.push({ position: [-0.18, 0.68, zPosLeft - 0.03], bankSide: -1, phase: (i + 0.5) * (Math.PI / 4), isIntake: true });
      configs.push({ position: [-0.18, 0.68, zPosLeft + 0.03], bankSide: -1, phase: (i + 0.5) * (Math.PI / 4) + (108 * Math.PI / 180), isIntake: false });
    }
    return configs;
  }, []);

  return (
    <group>
      {rockerConfigs.map((config, i) => (
        <RockerArmUnit 
          key={`rocker-${i}`} 
          position={config.position}
          bankSide={config.bankSide}
          engineRef={engineRef}
          phase={config.phase}
        />
      ))}
    </group>
  );
}

function RockerArmUnit({ 
  position, 
  bankSide,
  engineRef,
  phase
}: { 
  position: [number, number, number]; 
  bankSide: number;
  engineRef: React.MutableRefObject<{ crankAngle: number }>;
  phase: number;
}) {
  const rockerRef = useRef<THREE.Group>(null);
  const bankAngle = bankSide * BANK_ANGLE;
  
  useFrame(() => {
    if (rockerRef.current) {
      // Rocker PIVOTS ONLY on stud (no translation) - driven by cam lobe via pushrod
      // Cam rotates at exactly 1/2 crank speed
      const camAngle = engineRef.current.crankAngle * 0.5 + phase;
      const liftFactor = Math.max(0, Math.cos(camAngle));
      // Calculate pivot angle from lifter lift - rocker ratio 1.5:1 amplifies motion
      // When pushrod pushes UP on pushrod-cup end (-X), valve-tip end (+X) goes DOWN
      // Positive pivotAngle rotates clockwise: +X goes down, -X goes up (correct!)
      const maxPivotAngle = 0.18; // ~10 degrees max
      const pivotAngle = Math.min(liftFactor * 0.15, maxPivotAngle);
      // Rocker rotates around stud axis - bankAngle already applied by parent group
      rockerRef.current.rotation.z = -pivotAngle * bankSide;
    }
  });

  return (
    <group position={position} rotation={[0, 0, bankAngle]}>
      <group ref={rockerRef}>
        {/* Rocker arm body */}
        <mesh castShadow>
          <boxGeometry args={[0.07, 0.015, 0.02]} />
          <meshStandardMaterial color="#555" metalness={0.88} roughness={0.18} />
        </mesh>
        
        {/* Pushrod cup (one end) */}
        <mesh position={[-0.03, -0.005, 0]} castShadow>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial color="#404040" metalness={0.9} roughness={0.15} />
        </mesh>
        
        {/* Valve tip contact (roller tip) */}
        <mesh position={[0.03, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.015, 12]} />
          <meshStandardMaterial color="#606060" metalness={0.92} roughness={0.1} />
        </mesh>
      </group>
      
      {/* Rocker stud */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.04, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.85} roughness={0.2} />
      </mesh>
      
      {/* Adjusting nut */}
      <mesh position={[0, 0.045, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.012, 6]} />
        <meshStandardMaterial color="#505050" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

// ============================================================================
// VALVES AND VALVE SPRINGS
// ============================================================================
// Valve positions aligned with cylinder head valve seats
// intakeValveX = bankSide * 0.18, exhaustValveX = bankSide * 0.26
// intakeValveZ = zPos + boreRadius * 0.35, exhaustValveZ = zPos - boreRadius * 0.35
// Valve seat Y = deckSurfaceY + 0.005
const VALVE_SEAT_Y = DECK_HEIGHT + 0.005;
const BORE_RADIUS_FOR_VALVE = BORE / 2;
const VALVE_HEAD_HEIGHT = 0.12; // Cylinder head casting height (used in CylinderHeads)

function ValveAssemblies({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const valveConfigs = useMemo(() => {
    const configs: { 
      position: [number, number, number]; 
      bankSide: 1 | -1; 
      phase: number; 
      isIntake: boolean;
      cylinderIndex: number;
    }[] = [];
    
    for (let i = 0; i < 4; i++) {
      // Right bank (cylinders 1,3,5,7)
      const zPosRight = FIRST_CYLINDER_Z + i * CYLINDER_SPACING;
      
      // Use SAME phase as lifter/pushrod/rocker for mechanical linkage
      const rightIntakePhase = i * (Math.PI / 4);
      const rightExhaustPhase = i * (Math.PI / 4) + (108 * Math.PI / 180);
      
      // Intake valve position (toward inside of V, forward in cylinder)
      const intakeXRight = 0.18;
      const intakeZRight = zPosRight + BORE_RADIUS_FOR_VALVE * 0.35;
      configs.push({ 
        position: [intakeXRight, VALVE_SEAT_Y, intakeZRight], 
        bankSide: 1, 
        phase: rightIntakePhase, 
        isIntake: true,
        cylinderIndex: i
      });
      
      // Exhaust valve position (toward outside of V, rear in cylinder)
      const exhaustXRight = 0.26;
      const exhaustZRight = zPosRight - BORE_RADIUS_FOR_VALVE * 0.35;
      configs.push({ 
        position: [exhaustXRight, VALVE_SEAT_Y, exhaustZRight], 
        bankSide: 1, 
        phase: rightExhaustPhase, 
        isIntake: false,
        cylinderIndex: i
      });
      
      // Left bank (cylinders 2,4,6,8)
      const zPosLeft = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + BANK_OFFSET;
      
      // Use SAME phase as lifter/pushrod/rocker for mechanical linkage
      const leftIntakePhase = (i + 0.5) * (Math.PI / 4);
      const leftExhaustPhase = (i + 0.5) * (Math.PI / 4) + (108 * Math.PI / 180);
      
      // Intake valve (toward inside of V, forward in cylinder)
      const intakeXLeft = -0.18;
      const intakeZLeft = zPosLeft + BORE_RADIUS_FOR_VALVE * 0.35;
      configs.push({ 
        position: [intakeXLeft, VALVE_SEAT_Y, intakeZLeft], 
        bankSide: -1, 
        phase: leftIntakePhase, 
        isIntake: true,
        cylinderIndex: i
      });
      
      // Exhaust valve (toward outside of V, rear in cylinder)
      const exhaustXLeft = -0.26;
      const exhaustZLeft = zPosLeft - BORE_RADIUS_FOR_VALVE * 0.35;
      configs.push({ 
        position: [exhaustXLeft, VALVE_SEAT_Y, exhaustZLeft], 
        bankSide: -1, 
        phase: leftExhaustPhase, 
        isIntake: false,
        cylinderIndex: i
      });
    }
    return configs;
  }, []);

  return (
    <group>
      {valveConfigs.map((config, i) => (
        <ValveUnit 
          key={`valve-${i}`} 
          position={config.position}
          bankSide={config.bankSide}
          isIntake={config.isIntake}
          engineRef={engineRef}
          phase={config.phase}
        />
      ))}
    </group>
  );
}

function ValveUnit({ 
  position, 
  bankSide,
  isIntake,
  engineRef,
  phase
}: { 
  position: [number, number, number]; 
  bankSide: 1 | -1;
  isIntake: boolean;
  engineRef: React.MutableRefObject<{ crankAngle: number }>;
  phase: number;
}) {
  const valveRef = useRef<THREE.Group>(null);
  const bankAngle = bankSide * BANK_ANGLE;
  const valveHeadRadius = isIntake ? INTAKE_VALVE_DIA / 2 : EXHAUST_VALVE_DIA / 2;
  const stemRadius = VALVE_STEM_DIA / 2;
  
  // Valve is mechanically linked to lifter via pushrod and rocker arm
  // Uses SAME phase as its corresponding lifter/pushrod/rocker for proper linkage
  // Valve lift = cam lobe lift × rocker ratio (1.5:1)
  
  useFrame(() => {
    if (valveRef.current) {
      // Use SAME cam angle formula as LifterUnit for mechanical linkage
      // Cam rotates at exactly 1/2 crank speed
      const camAngle = engineRef.current.crankAngle * 0.5 + phase;
      const liftFactor = Math.max(0, Math.cos(camAngle));
      
      // Valve lift = cam lobe lift × rocker ratio (1.5:1)
      // CAM_LOBE_LIFT is already in scaled units, ROCKER_RATIO = 1.5
      const rawLift = liftFactor * CAM_LOBE_LIFT * ROCKER_RATIO;
      const clampedLift = Math.min(rawLift, MAX_VALVE_LIFT);
      
      // Valve moves DOWN into combustion chamber when opening
      // When rocker pivots (pushrod end up), valve end pushes DOWN
      valveRef.current.position.y = -clampedLift;
    }
  });

  // Use authentic valve spring dimensions from SBC 350 specs
  const springRadius = VALVE_SPRINGS_SCALED.OUTER_RADIUS;
  const springHeight = VALVE_SPRINGS_SCALED.INSTALLED_HEIGHT;
  const wireRadius = toUnits(VALVE_SPRINGS.WIRE_DIAMETER / 2);
  const coilCount = VALVE_SPRINGS.COIL_COUNT;
  const coilSpacing = springHeight / coilCount;
  
  // Valve stem length - extends from seat up through the head
  const stemLength = 0.12;
  const headHeight = VALVE_HEAD_HEIGHT;
  
  return (
    <group position={position} rotation={[0, 0, bankAngle]}>
      {/* Valve spring - positioned above the valve seat in the spring pocket */}
      {Array.from({ length: coilCount }).map((_, i) => (
        <mesh key={`spring-coil-${i}`} position={[0, headHeight * 0.3 + i * coilSpacing, 0]} castShadow>
          <torusGeometry args={[springRadius, wireRadius, 8, 24]} />
          <meshStandardMaterial color="#404040" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Spring retainer (top) */}
      <mesh position={[0, headHeight * 0.3 + springHeight + 0.006, 0]} castShadow>
        <cylinderGeometry args={[springRadius * 0.7, springRadius * 0.85, 0.012, 12]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.25} />
      </mesh>
      
      {/* Spring seat (bottom) */}
      <mesh position={[0, headHeight * 0.3 - 0.008, 0]} castShadow>
        <cylinderGeometry args={[springRadius * 1.05, springRadius * 1.05, 0.008, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.75} roughness={0.3} />
      </mesh>
      
      {/* Valve keepers (locks) */}
      <mesh position={[0.006, headHeight * 0.3 + springHeight + 0.015, 0]} castShadow>
        <boxGeometry args={[0.005, 0.008, 0.008]} />
        <meshStandardMaterial color="#707070" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[-0.006, headHeight * 0.3 + springHeight + 0.015, 0]} castShadow>
        <boxGeometry args={[0.005, 0.008, 0.008]} />
        <meshStandardMaterial color="#707070" metalness={0.85} roughness={0.2} />
      </mesh>
      
      {/* Valve assembly (stem + head) - this group animates */}
      <group ref={valveRef}>
        {/* Valve stem - extends upward from head through valve guide */}
        <mesh position={[0, stemLength / 2, 0]} castShadow>
          <cylinderGeometry args={[stemRadius, stemRadius, stemLength, 12]} />
          <meshStandardMaterial color="#888" metalness={0.95} roughness={0.08} />
        </mesh>
        
        {/* Valve head - positioned at the valve seat (Y=0 of this group) */}
        {/* When closed, the head sits flush with the seat. When open, it moves down (-Y) */}
        <mesh position={[0, -0.006, 0]} castShadow>
          <cylinderGeometry args={[valveHeadRadius, valveHeadRadius * 0.85, 0.012, 24]} />
          <meshStandardMaterial 
            color={isIntake ? "#909090" : "#707070"} 
            metalness={0.92} 
            roughness={0.1} 
          />
        </mesh>
        
        {/* Valve face angle (45° seating surface) */}
        <mesh position={[0, -0.001, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[valveHeadRadius, 0.008, 24]} />
          <meshStandardMaterial color="#808080" metalness={0.9} roughness={0.12} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// HEI DISTRIBUTOR (High Energy Ignition - larger cap for integrated coil)
// ============================================================================
function Distributor({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const rotorRef = useRef<THREE.Group>(null);
  
  // Distributor runs at cam speed (half crank speed)
  useFrame(() => {
    if (rotorRef.current) {
      rotorRef.current.rotation.y = engineRef.current.crankAngle * 0.5;
    }
  });

  // Position at rear of block, driven by camshaft
  const distZ = -BLOCK_LENGTH / 2 - 0.02;
  const distY = CAMSHAFT_SCALED.HEIGHT_FROM_CRANK;
  
  // HEI cap dimensions (much larger than points-style)
  const capRadius = DISTRIBUTOR_SCALED.CAP_RADIUS;
  const capHeight = DISTRIBUTOR_SCALED.CAP_HEIGHT;
  const housingRadius = DISTRIBUTOR_SCALED.HOUSING_DIAMETER / 2;
  const terminalRadius = DISTRIBUTOR_SCALED.TERMINAL_RADIUS;

  return (
    <group position={[0, distY, distZ]}>
      {/* === HOLD-DOWN CLAMP (at base, bolts to block) === */}
      <group position={[0, -0.02, 0]}>
        {/* Clamp bracket */}
        <mesh castShadow>
          <boxGeometry args={[DISTRIBUTOR_SCALED.CLAMP_LENGTH, 0.012, DISTRIBUTOR_SCALED.CLAMP_WIDTH]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Clamp bolt hole (driver side) */}
        <mesh position={[DISTRIBUTOR_SCALED.CLAMP_LENGTH / 2 - 0.02, 0.01, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.015, 6]} />
          <meshStandardMaterial color="#505050" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Clamp slot */}
        <mesh position={[0, 0.005, 0]} castShadow>
          <boxGeometry args={[housingRadius * 2.2, 0.008, housingRadius * 0.15]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.5} />
        </mesh>
      </group>
      
      {/* === DISTRIBUTOR HOUSING (lower body - goes into block) === */}
      <mesh castShadow>
        <cylinderGeometry args={[housingRadius, housingRadius * 1.05, 0.15, 20]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.6} />
      </mesh>
      
      {/* Housing flange (where it meets block) */}
      <mesh position={[0, -0.06, 0]} castShadow>
        <cylinderGeometry args={[housingRadius * 1.2, housingRadius * 1.15, 0.02, 20]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.5} />
      </mesh>
      
      {/* === HEI CAP (large diameter for internal coil) === */}
      {/* Cap base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[capRadius, capRadius * 0.95, capHeight * 0.5, 24]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.25} roughness={0.85} />
      </mesh>
      
      {/* Cap dome (HEI characteristic rounded top) */}
      <mesh position={[0, 0.1 + capHeight * 0.35, 0]} castShadow>
        <sphereGeometry args={[capRadius * 0.9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.25} roughness={0.85} />
      </mesh>
      
      {/* Cap ridge (near terminals) */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <torusGeometry args={[capRadius, 0.008, 12, 24]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
      </mesh>
      
      {/* === 8 SPARK PLUG WIRE TERMINALS (around cap perimeter) === */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8; // Offset for firing order
        const termX = Math.cos(angle) * terminalRadius;
        const termZ = Math.sin(angle) * terminalRadius;
        return (
          <group key={`terminal-${i}`} position={[termX, 0.12, termZ]}>
            {/* Terminal tower */}
            <mesh castShadow>
              <cylinderGeometry args={[DISTRIBUTOR_SCALED.TERMINAL_DIAMETER / 2, DISTRIBUTOR_SCALED.TERMINAL_DIAMETER / 2 * 0.9, 0.04, 10]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.35} roughness={0.75} />
            </mesh>
            {/* Terminal boot seat */}
            <mesh position={[0, 0.025, 0]} castShadow>
              <cylinderGeometry args={[DISTRIBUTOR_SCALED.TERMINAL_DIAMETER / 2 * 1.1, DISTRIBUTOR_SCALED.TERMINAL_DIAMETER / 2, 0.015, 10]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
            </mesh>
            {/* Cylinder number marker */}
            <mesh position={[0, 0.035, 0]} castShadow>
              <boxGeometry args={[0.008, 0.004, 0.002]} />
              <meshStandardMaterial color="#666" metalness={0.5} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
      
      {/* === COIL CONNECTOR (HEI has coil in cap - electrical connector on side) === */}
      <group position={[capRadius * 0.7, 0.18, 0]} rotation={[0, 0, Math.PI / 6]}>
        {/* Coil connector housing */}
        <mesh castShadow>
          <boxGeometry args={[0.05, 0.035, 0.03]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.4} roughness={0.7} />
        </mesh>
        {/* Connector pins */}
        <mesh position={[0.03, 0, 0]} castShadow>
          <boxGeometry args={[0.015, 0.02, 0.02]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
      
      {/* === TACHOMETER TERMINAL (center top on HEI) === */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.025, 10]} />
        <meshStandardMaterial color="#606060" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* === VACUUM ADVANCE CANISTER (characteristic of HEI) === */}
      <group position={[
        Math.cos(DISTRIBUTOR_SCALED.VACUUM_CANISTER_ANGLE_RAD) * capRadius * 0.9,
        0.02,
        Math.sin(DISTRIBUTOR_SCALED.VACUUM_CANISTER_ANGLE_RAD) * capRadius * 0.9
      ]}>
        {/* Vacuum canister body */}
        <mesh rotation={[0, -DISTRIBUTOR_SCALED.VACUUM_CANISTER_ANGLE_RAD + Math.PI / 2, 0]} castShadow>
          <cylinderGeometry args={[
            DISTRIBUTOR_SCALED.VACUUM_CANISTER_DIAMETER / 2,
            DISTRIBUTOR_SCALED.VACUUM_CANISTER_DIAMETER / 2 * 0.9,
            DISTRIBUTOR_SCALED.VACUUM_CANISTER_LENGTH,
            16
          ]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.5} />
        </mesh>
        {/* Canister end cap */}
        <mesh 
          position={[
            Math.cos(DISTRIBUTOR_SCALED.VACUUM_CANISTER_ANGLE_RAD) * DISTRIBUTOR_SCALED.VACUUM_CANISTER_LENGTH / 2,
            0,
            Math.sin(DISTRIBUTOR_SCALED.VACUUM_CANISTER_ANGLE_RAD) * DISTRIBUTOR_SCALED.VACUUM_CANISTER_LENGTH / 2
          ]} 
          rotation={[0, -DISTRIBUTOR_SCALED.VACUUM_CANISTER_ANGLE_RAD + Math.PI / 2, 0]}
          castShadow
        >
          <sphereGeometry args={[DISTRIBUTOR_SCALED.VACUUM_CANISTER_DIAMETER / 2 * 0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#222" metalness={0.5} roughness={0.6} />
        </mesh>
        {/* Vacuum hose nipple */}
        <mesh 
          position={[
            Math.cos(DISTRIBUTOR_SCALED.VACUUM_CANISTER_ANGLE_RAD) * (DISTRIBUTOR_SCALED.VACUUM_CANISTER_LENGTH / 2 + 0.02),
            0,
            Math.sin(DISTRIBUTOR_SCALED.VACUUM_CANISTER_ANGLE_RAD) * (DISTRIBUTOR_SCALED.VACUUM_CANISTER_LENGTH / 2 + 0.02)
          ]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[
            DISTRIBUTOR_SCALED.VACUUM_HOSE_DIAMETER / 2,
            DISTRIBUTOR_SCALED.VACUUM_HOSE_DIAMETER / 2 * 0.8,
            0.03,
            8
          ]} />
          <meshStandardMaterial color="#333" metalness={0.6} roughness={0.5} />
        </mesh>
        {/* Vacuum advance arm (connects to breaker plate) */}
        <mesh position={[-0.03, 0, 0.01]} castShadow>
          <boxGeometry args={[0.06, 0.008, 0.01]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
      
      {/* === ROTOR (rotating inside cap - driven by cam gear) === */}
      <group ref={rotorRef} position={[0, 0.08, 0]}>
        {/* Rotor body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.025, 16]} />
          <meshStandardMaterial color="#cc3300" metalness={0.35} roughness={0.6} />
        </mesh>
        {/* Rotor blade */}
        <mesh position={[0.035, 0.005, 0]} castShadow>
          <boxGeometry args={[0.05, 0.015, 0.012]} />
          <meshStandardMaterial color="#c02800" metalness={0.35} roughness={0.55} />
        </mesh>
        {/* Rotor tip (brass contact) */}
        <mesh position={[0.055, 0.005, 0]} castShadow>
          <boxGeometry args={[0.018, 0.01, 0.008]} />
          <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Rotor center contact */}
        <mesh position={[0, 0.018, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.012, 8]} />
          <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
      
      {/* === DISTRIBUTOR DRIVE SHAFT (extends into block) === */}
      <mesh position={[0, -0.12, 0]} castShadow>
        <cylinderGeometry args={[DISTRIBUTOR_SCALED.SHAFT_DIAMETER / 2, DISTRIBUTOR_SCALED.SHAFT_DIAMETER / 2, 0.18, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.85} roughness={0.2} />
      </mesh>
      
      {/* Distributor drive gear (meshes with cam gear) */}
      <mesh position={[0, -0.22, 0]} castShadow>
        <cylinderGeometry args={[DISTRIBUTOR_SCALED.DRIVE_GEAR_DIAMETER / 2, DISTRIBUTOR_SCALED.DRIVE_GEAR_DIAMETER / 2, 0.025, 16]} />
        <meshStandardMaterial color="#404040" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Gear teeth indication */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh 
            key={`gear-tooth-${i}`}
            position={[
              Math.cos(angle) * DISTRIBUTOR_SCALED.DRIVE_GEAR_DIAMETER / 2 * 1.1,
              -0.22,
              Math.sin(angle) * DISTRIBUTOR_SCALED.DRIVE_GEAR_DIAMETER / 2 * 1.1
            ]}
            castShadow
          >
            <boxGeometry args={[0.006, 0.02, 0.006]} />
            <meshStandardMaterial color="#353535" metalness={0.75} roughness={0.35} />
          </mesh>
        );
      })}
      
      {/* Oil pump drive shaft (bottom of distributor, drives oil pump) */}
      <mesh position={[0, -0.28, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.01, 0.08, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

// ============================================================================
// COMBUSTION CYCLE VISUALIZATION
// ============================================================================
function CombustionEffects({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const combustionConfigs = useMemo(() => {
    const configs: { position: [number, number, number]; bankSide: number; phaseOffset: number; cylinderNumber: number }[] = [];
    
    // Firing order: 1-8-4-3-6-5-7-2
    const firingOrder = [1, 8, 4, 3, 6, 5, 7, 2];
    
    for (let i = 0; i < 4; i++) {
      const zPosRight = FIRST_CYLINDER_Z + i * CYLINDER_SPACING;
      const zPosLeft = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + BANK_OFFSET;
      
      // Right bank cylinders (1,3,5,7)
      const rightCyl = i * 2 + 1;
      const rightFiringIndex = firingOrder.indexOf(rightCyl);
      configs.push({ 
        position: [0.18, 0.55, zPosRight], 
        bankSide: 1,
        phaseOffset: (rightFiringIndex / 8) * Math.PI * 4, // 720° cycle
        cylinderNumber: rightCyl
      });
      
      // Left bank cylinders (2,4,6,8)
      const leftCyl = i * 2 + 2;
      const leftFiringIndex = firingOrder.indexOf(leftCyl);
      configs.push({ 
        position: [-0.18, 0.55, zPosLeft], 
        bankSide: -1,
        phaseOffset: (leftFiringIndex / 8) * Math.PI * 4,
        cylinderNumber: leftCyl
      });
    }
    return configs;
  }, []);

  return (
    <group>
      {combustionConfigs.map((config, i) => (
        <CombustionChamber 
          key={`combustion-${i}`}
          position={config.position}
          bankSide={config.bankSide}
          phaseOffset={config.phaseOffset}
          engineRef={engineRef}
          cylinderNumber={config.cylinderNumber}
        />
      ))}
    </group>
  );
}

function CombustionChamber({ 
  position, 
  bankSide,
  phaseOffset,
  engineRef,
  cylinderNumber
}: { 
  position: [number, number, number]; 
  bankSide: number;
  phaseOffset: number;
  engineRef: React.MutableRefObject<{ crankAngle: number }>;
  cylinderNumber: number;
}) {
  const sparkRef = useRef<THREE.PointLight>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const intakeRef = useRef<THREE.Mesh>(null);
  const exhaustRef = useRef<THREE.Mesh>(null);
  
  const bankAngle = bankSide * BANK_ANGLE;
  
  useFrame(() => {
    // Calculate cycle phase (720° = full 4-stroke cycle)
    const cycleAngle = (engineRef.current.crankAngle + phaseOffset) % (Math.PI * 4);
    const cycleDegrees = (cycleAngle * 180 / Math.PI) % 720;
    
    // 4-stroke phases:
    // 0-180: Power (combustion)
    // 180-360: Exhaust
    // 360-540: Intake
    // 540-720: Compression
    
    // Spark/combustion effect (fires near TDC of power stroke, around 10-12° BTDC)
    const sparkWindow = 30; // degrees of visible spark/flame
    const sparkTiming = 350; // BTDC in cycle degrees (just before TDC)
    const isSparkActive = cycleDegrees > sparkTiming && cycleDegrees < (sparkTiming + sparkWindow + 100);
    
    if (sparkRef.current) {
      if (isSparkActive && cycleDegrees < sparkTiming + 10) {
        // Initial spark flash
        sparkRef.current.intensity = 8;
        sparkRef.current.color.setHex(0x4488ff); // Blue-white spark
      } else if (isSparkActive) {
        // Combustion glow (orange/yellow)
        const fadeProgress = (cycleDegrees - sparkTiming - 10) / 100;
        sparkRef.current.intensity = 5 * (1 - fadeProgress);
        sparkRef.current.color.setHex(0xff6600); // Orange flame
      } else {
        sparkRef.current.intensity = 0;
      }
    }
    
    if (flameRef.current) {
      // Flame expands during power stroke
      if (isSparkActive && cycleDegrees >= sparkTiming + 10) {
        const flameProgress = Math.min(1, (cycleDegrees - sparkTiming - 10) / 80);
        flameRef.current.visible = true;
        flameRef.current.scale.set(
          0.5 + flameProgress * 1.5,
          0.5 + flameProgress * 1.5,
          0.5 + flameProgress * 1.5
        );
        // @ts-ignore
        if (flameRef.current.material) {
          // @ts-ignore
          flameRef.current.material.opacity = 0.7 * (1 - flameProgress * 0.5);
        }
      } else {
        flameRef.current.visible = false;
      }
    }
    
    // Intake air/fuel mixture visualization
    if (intakeRef.current) {
      const isIntake = cycleDegrees >= 360 && cycleDegrees < 540;
      if (isIntake) {
        const intakeProgress = (cycleDegrees - 360) / 180;
        intakeRef.current.visible = true;
        intakeRef.current.scale.set(0.3 + intakeProgress * 0.7, 0.3 + intakeProgress * 0.7, 0.3 + intakeProgress * 0.7);
        // @ts-ignore
        if (intakeRef.current.material) {
          // @ts-ignore
          intakeRef.current.material.opacity = 0.3 * intakeProgress;
        }
      } else {
        intakeRef.current.visible = false;
      }
    }
    
    // Exhaust gases visualization
    if (exhaustRef.current) {
      const isExhaust = cycleDegrees >= 180 && cycleDegrees < 360;
      if (isExhaust) {
        const exhaustProgress = (cycleDegrees - 180) / 180;
        exhaustRef.current.visible = true;
        exhaustRef.current.position.y = 0.02 + exhaustProgress * 0.15;
        // @ts-ignore
        if (exhaustRef.current.material) {
          // @ts-ignore
          exhaustRef.current.material.opacity = 0.4 * (1 - exhaustProgress);
        }
      } else {
        exhaustRef.current.visible = false;
      }
    }
  });

  return (
    <group position={position} rotation={[0, 0, bankAngle]}>
      {/* Spark/combustion point light */}
      <pointLight 
        ref={sparkRef}
        position={[0, 0, 0]}
        intensity={0}
        distance={0.3}
        decay={2}
        color={0xff6600}
      />
      
      {/* Flame effect (expanding sphere) */}
      <mesh ref={flameRef} visible={false}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial 
          color={0xff4400} 
          transparent 
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>
      
      {/* Inner flame core */}
      <mesh visible={false}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial 
          color={0xffff00} 
          transparent 
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
      
      {/* Intake mixture (blue tint for air/fuel) */}
      <mesh ref={intakeRef} position={[0, 0.05, 0]} visible={false}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial 
          color={0x6699ff} 
          transparent 
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      
      {/* Exhaust gases (gray smoke) */}
      <mesh ref={exhaustRef} position={[0, 0.02, 0]} visible={false}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial 
          color={0x555555} 
          transparent 
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// SPARK PLUGS
// ============================================================================
function SparkPlugs() {
  const sparkPlugConfigs = useMemo(() => {
    const configs: { position: [number, number, number]; bankSide: number }[] = [];
    
    for (let i = 0; i < 4; i++) {
      const zPosRight = FIRST_CYLINDER_Z + i * CYLINDER_SPACING;
      const zPosLeft = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + BANK_OFFSET;
      // Right bank spark plugs
      configs.push({ position: [0.28, 0.52, zPosRight], bankSide: 1 });
      // Left bank spark plugs
      configs.push({ position: [-0.28, 0.52, zPosLeft], bankSide: -1 });
    }
    return configs;
  }, []);

  return (
    <group>
      {sparkPlugConfigs.map((config, i) => (
        <SparkPlug 
          key={`spark-${i}`} 
          position={config.position}
          bankSide={config.bankSide}
        />
      ))}
    </group>
  );
}

function SparkPlug({ position, bankSide }: { position: [number, number, number]; bankSide: number }) {
  const bankAngle = bankSide * BANK_ANGLE;
  
  return (
    <group position={position} rotation={[0, 0, bankAngle]}>
      {/* Spark plug body (hex) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.025, 6]} />
        <meshStandardMaterial color="#888" metalness={0.85} roughness={0.2} />
      </mesh>
      
      {/* Ceramic insulator */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.03, 12]} />
        <meshStandardMaterial color="#f5f5f0" metalness={0.1} roughness={0.6} />
      </mesh>
      
      {/* Terminal */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.004, 0.004, 0.015, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.25} />
      </mesh>
      
      {/* Electrode (bottom) */}
      <mesh position={[0, -0.018, 0]} castShadow>
        <cylinderGeometry args={[0.003, 0.003, 0.015, 8]} />
        <meshStandardMaterial color="#707070" metalness={0.9} roughness={0.15} />
      </mesh>
    </group>
  );
}

// ============================================================================
// ROCHESTER QUADRAJET CARBURETOR (750 CFM - 4-Barrel Spread Bore)
// ============================================================================
function RochesterQuadrajet() {
  const carbHeight = CARBURETOR_SCALED.OVERALL_HEIGHT;
  const carbWidth = CARBURETOR_SCALED.OVERALL_WIDTH;
  const carbLength = CARBURETOR_SCALED.OVERALL_LENGTH;
  
  return (
    <group>
      {/* === THROTTLE BODY (base plate) === */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[carbWidth, CARBURETOR_SCALED.THROTTLE_BODY_HEIGHT, carbLength]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.75} roughness={0.3} />
      </mesh>
      
      {/* Primary throttle bores (2 small - front) */}
      {[-1, 1].map((side) => (
        <mesh 
          key={`primary-bore-${side}`}
          position={[side * CARBURETOR_SCALED.PRIMARY_BORE_SPACING / 2, 0, -carbLength * 0.25]} 
          castShadow
        >
          <cylinderGeometry args={[CARBURETOR_SCALED.PRIMARY_BORE_RADIUS, CARBURETOR_SCALED.PRIMARY_BORE_RADIUS, CARBURETOR_SCALED.THROTTLE_BODY_HEIGHT + 0.01, 16]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
        </mesh>
      ))}
      
      {/* Secondary throttle bores (2 large - rear) */}
      {[-1, 1].map((side) => (
        <mesh 
          key={`secondary-bore-${side}`}
          position={[side * CARBURETOR_SCALED.SECONDARY_BORE_SPACING / 4, 0, carbLength * 0.2]} 
          castShadow
        >
          <cylinderGeometry args={[CARBURETOR_SCALED.SECONDARY_BORE_RADIUS, CARBURETOR_SCALED.SECONDARY_BORE_RADIUS, CARBURETOR_SCALED.THROTTLE_BODY_HEIGHT + 0.01, 20]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
        </mesh>
      ))}
      
      {/* === FLOAT BOWL (main body) === */}
      <mesh position={[0, CARBURETOR_SCALED.THROTTLE_BODY_HEIGHT / 2 + CARBURETOR_SCALED.FLOAT_BOWL_HEIGHT / 2, 0]} castShadow>
        <boxGeometry args={[carbWidth * 0.95, CARBURETOR_SCALED.FLOAT_BOWL_HEIGHT, carbLength * 0.95]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.45} />
      </mesh>
      
      {/* Float bowl side details */}
      {[-1, 1].map((side) => (
        <mesh 
          key={`bowl-side-${side}`}
          position={[side * carbWidth * 0.45, CARBURETOR_SCALED.THROTTLE_BODY_HEIGHT / 2 + CARBURETOR_SCALED.FLOAT_BOWL_HEIGHT / 2, 0]} 
          castShadow
        >
          <boxGeometry args={[0.015, CARBURETOR_SCALED.FLOAT_BOWL_HEIGHT * 0.7, carbLength * 0.6]} />
          <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      
      {/* === AIR HORN (top section) === */}
      <mesh position={[0, CARBURETOR_SCALED.THROTTLE_BODY_HEIGHT / 2 + CARBURETOR_SCALED.FLOAT_BOWL_HEIGHT + CARBURETOR_SCALED.AIR_HORN_HEIGHT / 2, 0]} castShadow>
        <boxGeometry args={[carbWidth * 0.9, CARBURETOR_SCALED.AIR_HORN_HEIGHT, carbLength * 0.9]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.35} />
      </mesh>
      
      {/* Air horn venturi clusters */}
      <mesh position={[0, carbHeight - 0.02, 0]} castShadow>
        <boxGeometry args={[carbWidth * 0.75, 0.025, carbLength * 0.75]} />
        <meshStandardMaterial color="#101010" metalness={0.4} roughness={0.7} />
      </mesh>
      
      {/* === AIR CLEANER STUD (center top) === */}
      <mesh position={[0, carbHeight + 0.03, 0]} castShadow>
        <cylinderGeometry args={[CARBURETOR_SCALED.AIR_CLEANER_STUD_DIAMETER / 2, CARBURETOR_SCALED.AIR_CLEANER_STUD_DIAMETER / 2, 0.06, 12]} />
        <meshStandardMaterial color="#505050" metalness={0.85} roughness={0.2} />
      </mesh>
      
      {/* === FUEL INLET (driver side - left) === */}
      <group position={[CARBURETOR_SCALED.FUEL_INLET_OFFSET_X, CARBURETOR_SCALED.THROTTLE_BODY_HEIGHT + CARBURETOR_SCALED.FLOAT_BOWL_HEIGHT * 0.6, 0]}>
        {/* Fuel filter housing */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, CARBURETOR_SCALED.FUEL_FILTER_LENGTH, 12]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Inlet fitting */}
        <mesh position={[-CARBURETOR_SCALED.FUEL_FILTER_LENGTH / 2 - 0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.012, 0.018, 0.04, 8]} />
          <meshStandardMaterial color="#555" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>
      
      {/* === THROTTLE LINKAGE (passenger side - right) === */}
      <group position={[CARBURETOR_SCALED.THROTTLE_LEVER_OFFSET_X, CARBURETOR_SCALED.THROTTLE_BODY_HEIGHT * 0.3, 0]}>
        {/* Throttle shaft */}
        <mesh rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, carbLength * 0.8, 8]} />
          <meshStandardMaterial color="#404040" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Throttle lever */}
        <mesh position={[0.04, 0, -carbLength * 0.3]} rotation={[0, 0, -0.3]} castShadow>
          <boxGeometry args={[CARBURETOR_SCALED.THROTTLE_LEVER_LENGTH * 0.6, 0.008, 0.02]} />
          <meshStandardMaterial color="#333" metalness={0.75} roughness={0.35} />
        </mesh>
        {/* Kickdown linkage bracket */}
        <mesh position={[0.02, 0.02, carbLength * 0.25]} castShadow>
          <boxGeometry args={[0.03, 0.015, 0.015]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
      
      {/* Choke housing (front) */}
      <mesh position={[0, carbHeight - CARBURETOR_SCALED.AIR_HORN_HEIGHT * 0.3, -carbLength * 0.4]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ============================================================================
// INTAKE MANIFOLD (Chevy 350 Cast Iron/Aluminum Dual-Plane with V-Valley Fit)
// ============================================================================
function IntakeManifold() {
  const manifoldHeight = INTAKE_MANIFOLD_SCALED.HEIGHT;
  const manifoldLength = INTAKE_MANIFOLD_SCALED.LENGTH;
  const manifoldWidth = INTAKE_MANIFOLD_SCALED.WIDTH;
  const valleyAngle = INTAKE_MANIFOLD_SCALED.VALLEY_ANGLE_RAD;
  
  return (
    <group position={[0, 0.58, 0]}>
      {/* === V-SHAPED MANIFOLD BODY (fits lifter valley) === */}
      {/* Central plenum base (fills the V) */}
      <mesh castShadow>
        <boxGeometry args={[INTAKE_MANIFOLD_SCALED.VALLEY_FLOOR_WIDTH, manifoldHeight * 0.4, manifoldLength * 0.85]} />
        <meshStandardMaterial color="#8B0000" metalness={0.35} roughness={0.6} />
      </mesh>
      
      {/* Right bank V-angle surface */}
      <mesh 
        position={[INTAKE_MANIFOLD_SCALED.VALLEY_FLOOR_WIDTH * 0.35, manifoldHeight * 0.15, 0]} 
        rotation={[0, 0, -valleyAngle * 0.6]}
        castShadow
      >
        <boxGeometry args={[manifoldWidth * 0.35, manifoldHeight * 0.35, manifoldLength * 0.85]} />
        <meshStandardMaterial color="#8B0000" metalness={0.35} roughness={0.6} />
      </mesh>
      
      {/* Left bank V-angle surface */}
      <mesh 
        position={[-INTAKE_MANIFOLD_SCALED.VALLEY_FLOOR_WIDTH * 0.35, manifoldHeight * 0.15, 0]} 
        rotation={[0, 0, valleyAngle * 0.6]}
        castShadow
      >
        <boxGeometry args={[manifoldWidth * 0.35, manifoldHeight * 0.35, manifoldLength * 0.85]} />
        <meshStandardMaterial color="#8B0000" metalness={0.35} roughness={0.6} />
      </mesh>
      
      {/* Upper plenum (central) */}
      <mesh position={[0, manifoldHeight * 0.35, 0]} castShadow>
        <boxGeometry args={[manifoldWidth * 0.5, manifoldHeight * 0.3, manifoldLength * 0.75]} />
        <meshStandardMaterial color="#8B0000" metalness={0.35} roughness={0.55} />
      </mesh>
      
      {/* === CARBURETOR MOUNTING PAD (Quadrajet spread-bore pattern) === */}
      <mesh position={[0, manifoldHeight * 0.52, 0]} castShadow>
        <boxGeometry args={[INTAKE_MANIFOLD_SCALED.CARB_PAD_WIDTH, 0.025, INTAKE_MANIFOLD_SCALED.CARB_PAD_LENGTH]} />
        <meshStandardMaterial color="#7a1010" metalness={0.4} roughness={0.5} />
      </mesh>
      
      {/* Carb mounting studs (4 corners) */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z], i) => (
        <mesh 
          key={`carb-stud-${i}`}
          position={[x * INTAKE_MANIFOLD_SCALED.CARB_PAD_WIDTH * 0.38, manifoldHeight * 0.55, z * INTAKE_MANIFOLD_SCALED.CARB_PAD_LENGTH * 0.38]} 
          castShadow
        >
          <cylinderGeometry args={[0.008, 0.008, 0.04, 8]} />
          <meshStandardMaterial color="#505050" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      
      {/* === ROCHESTER QUADRAJET CARBURETOR === */}
      <group position={[0, manifoldHeight * 0.55 + 0.02, 0]}>
        <RochesterQuadrajet />
      </group>
      
      {/* === THERMOSTAT HOUSING BOSS (front) === */}
      <group position={[0, manifoldHeight * 0.25, manifoldLength * 0.48]}>
        {/* Thermostat housing boss */}
        <mesh castShadow>
          <cylinderGeometry args={[INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_DIAMETER / 2, INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_DIAMETER / 2 * 1.1, INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_HEIGHT, 20]} />
          <meshStandardMaterial color="#7a1010" metalness={0.4} roughness={0.55} />
        </mesh>
        {/* Thermostat opening */}
        <mesh position={[0, INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_HEIGHT / 2, 0]} castShadow>
          <cylinderGeometry args={[INTAKE_MANIFOLD_SCALED.THERMOSTAT_OPENING_DIAMETER / 2, INTAKE_MANIFOLD_SCALED.THERMOSTAT_OPENING_DIAMETER / 2, 0.02, 16]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.8} />
        </mesh>
        {/* Thermostat housing cap */}
        <mesh position={[0, INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_HEIGHT / 2 + 0.015, 0]} castShadow>
          <cylinderGeometry args={[INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_DIAMETER / 2 * 0.9, INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_DIAMETER / 2 * 0.85, 0.025, 16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* Housing bolt */}
        <mesh position={[0, INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_HEIGHT / 2 + 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.015, 6]} />
          <meshStandardMaterial color="#505050" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Upper radiator hose fitting */}
        <mesh position={[0, INTAKE_MANIFOLD_SCALED.THERMOSTAT_BOSS_HEIGHT / 2 + 0.025, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.08, 12]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.45} />
        </mesh>
      </group>
      
      {/* === WATER CROSSOVER PASSAGE (visible at front/rear) === */}
      <mesh position={[0, manifoldHeight * 0.1, manifoldLength * 0.42]} castShadow>
        <boxGeometry args={[manifoldWidth * 0.4, INTAKE_MANIFOLD_SCALED.WATER_CROSSOVER_DEPTH, INTAKE_MANIFOLD_SCALED.WATER_CROSSOVER_WIDTH]} />
        <meshStandardMaterial color="#6a0a0a" metalness={0.35} roughness={0.65} />
      </mesh>
      
      {/* === 8 INTAKE RUNNERS (4 per bank, connecting to head ports) === */}
      {[0, 1, 2, 3].map((i) => {
        const zPosRight = FIRST_CYLINDER_Z + i * CYLINDER_SPACING;
        const zPosLeft = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + BANK_OFFSET;
        const runnerLength = 0.18;
        const runnerWidth = INTAKE_MANIFOLD_SCALED.RUNNER_OUTLET_WIDTH;
        const runnerHeight = INTAKE_MANIFOLD_SCALED.RUNNER_OUTLET_HEIGHT;
        
        return (
          <group key={`runner-pair-${i}`}>
            {/* Right bank runner */}
            <group position={[manifoldWidth * 0.22, -0.02, zPosRight]}>
              {/* Runner tube */}
              <mesh rotation={[0, 0, 0.45]} castShadow>
                <boxGeometry args={[runnerWidth, runnerLength, runnerHeight]} />
                <meshStandardMaterial color="#7a1010" metalness={0.35} roughness={0.6} />
              </mesh>
              {/* Port flange */}
              <mesh position={[0.08, -0.1, 0]} rotation={[0, 0, BANK_ANGLE]} castShadow>
                <boxGeometry args={[runnerWidth * 1.15, 0.015, runnerHeight * 1.15]} />
                <meshStandardMaterial color="#6a0a0a" metalness={0.4} roughness={0.55} />
              </mesh>
            </group>
            
            {/* Left bank runner */}
            <group position={[-manifoldWidth * 0.22, -0.02, zPosLeft]}>
              {/* Runner tube */}
              <mesh rotation={[0, 0, -0.45]} castShadow>
                <boxGeometry args={[runnerWidth, runnerLength, runnerHeight]} />
                <meshStandardMaterial color="#7a1010" metalness={0.35} roughness={0.6} />
              </mesh>
              {/* Port flange */}
              <mesh position={[-0.08, -0.1, 0]} rotation={[0, 0, -BANK_ANGLE]} castShadow>
                <boxGeometry args={[runnerWidth * 1.15, 0.015, runnerHeight * 1.15]} />
                <meshStandardMaterial color="#6a0a0a" metalness={0.4} roughness={0.55} />
              </mesh>
            </group>
          </group>
        );
      })}
      
      {/* Manifold mounting bosses (12 total - 6 per side) */}
      {[0, 1, 2].map((i) => {
        const zPos = FIRST_CYLINDER_Z + (i + 0.5) * CYLINDER_SPACING;
        return (
          <group key={`bolt-pair-${i}`}>
            {/* Right side bolts */}
            <mesh position={[manifoldWidth * 0.35, -0.05, zPos]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.03, 6]} />
              <meshStandardMaterial color="#505050" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[manifoldWidth * 0.35, -0.05, zPos + CYLINDER_SPACING * 0.5]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.03, 6]} />
              <meshStandardMaterial color="#505050" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Left side bolts */}
            <mesh position={[-manifoldWidth * 0.35, -0.05, zPos]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.03, 6]} />
              <meshStandardMaterial color="#505050" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[-manifoldWidth * 0.35, -0.05, zPos + CYLINDER_SPACING * 0.5]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.03, 6]} />
              <meshStandardMaterial color="#505050" metalness={0.85} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// EXHAUST HEADERS
// ============================================================================
function ExhaustHeaders() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={`header-${side}`}>
          {[0, 1, 2, 3].map((i) => {
            const bankZOffset = side === -1 ? BANK_OFFSET : 0;
            const zPos = FIRST_CYLINDER_Z + i * CYLINDER_SPACING + bankZOffset;
            const bankAngle = side * BANK_ANGLE;
            
            return (
              <group key={`tube-${i}`}>
                {/* Primary tube from head */}
                <mesh 
                  position={[
                    side * 0.42 * Math.cos(bankAngle) + side * 0.15 * Math.sin(bankAngle),
                    0.42 * Math.cos(bankAngle) + 0.15 * Math.sin(bankAngle),
                    zPos
                  ]} 
                  rotation={[0, 0, side * 0.7]}
                  castShadow
                >
                  <cylinderGeometry args={[0.024, 0.026, 0.18, 12]} />
                  <meshStandardMaterial color="#4a4a4a" metalness={0.88} roughness={0.28} />
                </mesh>
                
                {/* Bend section */}
                <mesh 
                  position={[side * 0.52, 0.22, zPos]} 
                  rotation={[Math.PI / 2, 0, side * 0.2]}
                  castShadow
                >
                  <cylinderGeometry args={[0.022, 0.024, 0.1, 12]} />
                  <meshStandardMaterial color="#404040" metalness={0.85} roughness={0.32} />
                </mesh>
              </group>
            );
          })}
          
          {/* Collector */}
          <mesh position={[side * 0.58, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.04, 1.1, 14]} />
            <meshStandardMaterial color="#333" metalness={0.8} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// PULLEYS & BELT SYSTEM
// ============================================================================
function CrankPulley({ engineRef }: { engineRef: React.MutableRefObject<{ crankAngle: number }> }) {
  const pulleyRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (pulleyRef.current) {
      pulleyRef.current.rotation.z = engineRef.current.crankAngle;
    }
  });

  return (
    <group position={[0, CRANKSHAFT_Y, BLOCK_LENGTH / 2 + 0.1]}>
      <group ref={pulleyRef}>
        {/* Harmonic balancer - inner hub (steel, pressed onto crank) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 28]} />
          <meshStandardMaterial color="#404040" metalness={0.92} roughness={0.1} />
        </mesh>
        
        {/* Keyway in hub */}
        <mesh position={[0.055, 0, 0]} castShadow>
          <boxGeometry args={[0.012, 0.02, 0.06]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </mesh>
        
        {/* Rubber damper ring (elastomer - absorbs harmonics) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.085, 0.025, 16, 48]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.95} />
        </mesh>
        
        {/* Outer inertia ring (heavy steel mass) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.05, 40]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.2} />
        </mesh>
        
        {/* Outer ring edge */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.16, 0.012, 12, 40]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.35} />
        </mesh>
        
        {/* Belt pulley grooves (3-groove design) */}
        {[0.10, 0.12, 0.14].map((r, i) => (
          <mesh key={`groove-${i}`} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]} castShadow>
            <torusGeometry args={[r, 0.008, 12, 40]} />
            <meshStandardMaterial color="#222" metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
        
        {/* Pulley face plate */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.055]} castShadow>
          <ringGeometry args={[0.06, 0.15, 40]} />
          <meshStandardMaterial color="#333" metalness={0.75} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Timing marks (TDC indicator) */}
        <mesh position={[0.155, 0, 0]} castShadow>
          <boxGeometry args={[0.02, 0.004, 0.055]} />
          <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.7} />
        </mesh>
        
        {/* Additional timing lines */}
        {[15, 30, 45].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <mesh key={`mark-${deg}`} position={[Math.cos(rad) * 0.155, Math.sin(rad) * 0.155, 0]} castShadow>
              <boxGeometry args={[0.01, 0.002, 0.055]} />
              <meshStandardMaterial color="#808080" metalness={0.3} roughness={0.7} />
            </mesh>
          );
        })}
        
        {/* Center bolt */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.03, 12]} />
          <meshStandardMaterial color="#505050" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
    </group>
  );
}

function AccessoryPulley({ 
  position, 
  radius, 
  engineRef,
  gearRatio = 1,
  label
}: { 
  position: [number, number, number];
  radius: number;
  engineRef: React.MutableRefObject<{ crankAngle: number }>;
  gearRatio?: number;
  label?: string;
}) {
  const pulleyRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (pulleyRef.current) {
      pulleyRef.current.rotation.z = engineRef.current.crankAngle * gearRatio;
    }
  });

  return (
    <group position={position}>
      <group ref={pulleyRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[radius, radius, 0.035, 24]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.4} />
        </mesh>
        
        {/* Pulley groove */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[radius, 0.008, 8, 24]} />
          <meshStandardMaterial color="#111" metalness={0.5} roughness={0.6} />
        </mesh>
        
        {/* Center hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[radius * 0.3, radius * 0.3, 0.045, 16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function SerpentineBelt() {
  const beltZ = BLOCK_LENGTH / 2 + 0.1;
  const beltPoints = useMemo(() => {
    const points: [number, number][] = [
      [0, CRANKSHAFT_Y],           // Crank pulley
      [0.22, 0.08],                // Alternator
      [0.24, 0.28],                // Power steering
      [0, 0.4],                    // Water pump
      [-0.24, 0.28],               // Smog pump
      [-0.22, 0.08],               // A/C
    ];
    return points;
  }, []);

  return (
    <group position={[0, 0, beltZ]}>
      {beltPoints.map((point, i) => {
        const nextPoint = beltPoints[(i + 1) % beltPoints.length];
        const midX = (point[0] + nextPoint[0]) / 2;
        const midY = (point[1] + nextPoint[1]) / 2;
        const dx = nextPoint[0] - point[0];
        const dy = nextPoint[1] - point[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        return (
          <mesh key={i} position={[midX, midY, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
            <boxGeometry args={[0.022, length, 0.01]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// HEAT VISUALIZATION OVERLAY (on engine components)
// ============================================================================
function HeatVisualization() {
  const { temperature, stress, hasFailed, failureType } = useEngine();
  const heatRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<THREE.Group>(null);
  const [debrisParticles, setDebrisParticles] = useState<{
    position: [number, number, number];
    velocity: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  }[]>([]);
  
  useFrame((_, delta) => {
    if (heatRef.current) {
      // Pulsing heat glow based on temperature
      const intensity = temperature * 0.5;
      heatRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = intensity * 0.3;
        }
      });
    }
    
    // Animate debris on failure
    if (hasFailed && debrisRef.current) {
      debrisRef.current.children.forEach((child, i) => {
        if (debrisParticles[i]) {
          const particle = debrisParticles[i];
          child.position.x += particle.velocity[0] * delta;
          child.position.y += particle.velocity[1] * delta;
          child.position.z += particle.velocity[2] * delta;
          
          // Gravity
          particle.velocity[1] -= 9.8 * delta;
          
          child.rotation.x += particle.rotation[0] * delta;
          child.rotation.y += particle.rotation[1] * delta;
          child.rotation.z += particle.rotation[2] * delta;
        }
      });
    }
  });

  // Generate debris particles on failure
  useEffect(() => {
    if (hasFailed && debrisParticles.length === 0) {
      const particles = [];
      const numParticles = 20;
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          position: [
            (Math.random() - 0.5) * 0.3,
            0.2 + Math.random() * 0.3,
            (Math.random() - 0.5) * 0.4
          ] as [number, number, number],
          velocity: [
            (Math.random() - 0.5) * 2,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 2
          ] as [number, number, number],
          rotation: [
            Math.random() * 10,
            Math.random() * 10,
            Math.random() * 10
          ] as [number, number, number],
          scale: 0.01 + Math.random() * 0.03,
        });
      }
      setDebrisParticles(particles);
    } else if (!hasFailed && debrisParticles.length > 0) {
      setDebrisParticles([]);
    }
  }, [hasFailed]);

  const heatColor = temperature < 0.5 ? '#ffaa00' : temperature < 0.75 ? '#ff6600' : '#ff2200';

  return (
    <group>
      {/* Heat glow on engine block */}
      <group ref={heatRef}>
        {temperature > 0.4 && (
          <>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.5, 0.6, 1.2]} />
              <meshBasicMaterial color={heatColor} transparent opacity={temperature * 0.2} depthWrite={false} />
            </mesh>
            {/* Exhaust manifold heat glow */}
            <mesh position={[0.5, 0.4, 0]}>
              <boxGeometry args={[0.15, 0.3, 1.0]} />
              <meshBasicMaterial color={heatColor} transparent opacity={temperature * 0.3} depthWrite={false} />
            </mesh>
            <mesh position={[-0.5, 0.4, 0]}>
              <boxGeometry args={[0.15, 0.3, 1.0]} />
              <meshBasicMaterial color={heatColor} transparent opacity={temperature * 0.3} depthWrite={false} />
            </mesh>
          </>
        )}
      </group>
      
      {/* Failure debris particles */}
      {hasFailed && (
        <group ref={debrisRef}>
          {debrisParticles.map((particle, i) => (
            <mesh 
              key={`debris-${i}`}
              position={particle.position}
              scale={particle.scale}
            >
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          
          {/* Smoke/fire effect on failure */}
          <pointLight position={[0, 0.3, 0]} color="#ff4400" intensity={5} distance={1} decay={2} />
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#ff2200" transparent opacity={0.7} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshBasicMaterial color="#333" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      )}
      
      {/* Stress indicator - red outline on highly stressed areas */}
      {stress > 0.5 && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.52, 0.62, 1.22]} />
          <meshBasicMaterial 
            color="#ff0000" 
            transparent 
            opacity={stress * 0.15} 
            wireframe 
          />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// MAIN ENGINE COMPONENT
// ============================================================================
export function AnimatedV8Engine({ debugMode = false, onTelemetryUpdate }: { 
  debugMode?: boolean;
  onTelemetryUpdate?: (cylinders: CylinderTelemetry[], crankAngleDeg: number) => void;
}) {
  const { currentRPM, updateRPM, hasFailed, xrayMode, cadMode, blockVisible } = useEngine();
  const physicsEngine = usePhysicsEngine();
  const usePhysicsMode = physicsEngine.usePhysicsMode;
  
  const engineRef = useRef({ 
    crankAngle: 0,
    physicsData: null as { cylinders: PhysicsCylinderState[] } | null
  });
  const pulleyZ = BLOCK_LENGTH / 2 + 0.1;
  const telemetryRef = useRef<CylinderTelemetry[]>(
    Array.from({ length: 8 }, (_, i) => ({
      cylinderNumber: i + 1,
      rodAngleDeg: 0,
      pistonPositionInches: 0,
      phase: 'compression' as const,
    }))
  );
  const frameCount = useRef(0);

  const pistonConfigs = useMemo(() => {
    const configs = [];
    for (let bank = 0; bank < 2; bank++) {
      for (let i = 0; i < 4; i++) {
        const bankSide = bank === 0 ? 1 : -1;
        const phaseOffset = bank === 0 ? V8_PHASE_OFFSETS_RIGHT_BANK[i] : V8_PHASE_OFFSETS_LEFT_BANK[i];
        configs.push({
          cylinderIndex: i,
          phaseOffset,
          bankSide: bankSide as 1 | -1,
        });
      }
    }
    return configs;
  }, []);

  const handleTelemetry = useCallback((cylinderNumber: number, data: Omit<CylinderTelemetry, 'cylinderNumber'>) => {
    const idx = telemetryRef.current.findIndex(c => c.cylinderNumber === cylinderNumber);
    if (idx !== -1) {
      telemetryRef.current[idx] = { ...telemetryRef.current[idx], ...data };
    }
  }, []);

  useFrame((_, delta) => {
    if (usePhysicsMode) {
      // Physics-based engine simulation
      physicsEngine.step(delta);
      
      // Get crank angle from physics simulation
      engineRef.current.crankAngle = physicsEngine.getCrankAngle();
      engineRef.current.physicsData = {
        cylinders: physicsEngine.physicsState.cylinders
      };
    } else {
      // Simple RPM-based animation (legacy mode)
      updateRPM(delta);
      
      if (currentRPM > 0) {
        const angularVelocity = (currentRPM * 2 * Math.PI) / 60;
        engineRef.current.crankAngle += angularVelocity * delta;
      }
      engineRef.current.physicsData = null;
    }
    
    // Report telemetry to parent every 15 frames
    frameCount.current++;
    if (onTelemetryUpdate && debugMode && frameCount.current % 15 === 0) {
      const crankAngleDeg = ((engineRef.current.crankAngle * 180 / Math.PI) % 720 + 720) % 720;
      onTelemetryUpdate([...telemetryRef.current], crankAngleDeg);
    }
  });

  return (
    <CadModeContext.Provider value={cadMode}>
    <DebugContext.Provider value={{ debugMode }}>
      <group scale={2.5} position={[0, -0.1, 0]}>
        {/* Engine block - conditionally render for FPS improvement */}
        {blockVisible && <EngineBlock350 debugMode={debugMode} xrayMode={xrayMode} />}
        
        {/* Cylinder heads - both banks - conditionally render */}
        {blockVisible && <CylinderHead bankSide={1} debugMode={debugMode} xrayMode={xrayMode} />}
        {blockVisible && <CylinderHead bankSide={-1} debugMode={debugMode} xrayMode={xrayMode} />}
        
        {/* Crankshaft */}
        <DetailedCrankshaft engineRef={engineRef} debugMode={debugMode} />
        
        {/* Piston assemblies */}
        {pistonConfigs.map((config, index) => (
          <PistonAssembly
            key={index}
            cylinderIndex={config.cylinderIndex}
            phaseOffset={config.phaseOffset}
            bankSide={config.bankSide}
            engineRef={engineRef}
            debugMode={debugMode}
            onTelemetry={handleTelemetry}
          />
        ))}

        {/* Complete Valvetrain System - rotating parts always visible */}
        <Camshaft engineRef={engineRef} debugMode={debugMode} />
        <TimingChainSystem engineRef={engineRef} />
        {blockVisible && <TimingCover />}
        {blockVisible && <WaterPump engineRef={engineRef} />}
        <HydraulicLifters engineRef={engineRef} />
        <Pushrods engineRef={engineRef} />
        <RockerArms engineRef={engineRef} />
        <ValveAssemblies engineRef={engineRef} />
        
        {/* Ignition System - hide static parts when block hidden */}
        {blockVisible && <Distributor engineRef={engineRef} />}
        {blockVisible && <SparkPlugs />}
        
        {/* Combustion Cycle Effects - hide when block hidden */}
        {blockVisible && <CombustionEffects engineRef={engineRef} />}
        
        {/* Heat and Stress Visualization - hide when block hidden */}
        {blockVisible && <HeatVisualization />}

        {/* Intake manifold - hide when block is hidden */}
        {blockVisible && <IntakeManifold />}
        
        {/* Exhaust - hide when block is hidden */}
        {blockVisible && <ExhaustHeaders />}
        
        {/* Bottom End - Oil System - hide when block is hidden */}
        {blockVisible && <OilPan />}
        {blockVisible && <OilPump />}

        {/* Pulley system - hide when block hidden (except crank pulley for reference) */}
        <CrankPulley engineRef={engineRef} />
        {blockVisible && (
          <>
            <AccessoryPulley position={[0.22, 0.08, pulleyZ]} radius={0.055} engineRef={engineRef} gearRatio={1.5} label="ALT" />
            <AccessoryPulley position={[-0.22, 0.08, pulleyZ]} radius={0.06} engineRef={engineRef} gearRatio={1.4} label="A/C" />
            <AccessoryPulley position={[0.24, 0.28, pulleyZ]} radius={0.045} engineRef={engineRef} gearRatio={1.8} label="P/S" />
            <AccessoryPulley position={[-0.24, 0.28, pulleyZ]} radius={0.05} engineRef={engineRef} gearRatio={1.6} label="Smog" />
            <AccessoryPulley position={[0, 0.4, pulleyZ]} radius={0.065} engineRef={engineRef} gearRatio={1.0} label="W/P" />
            <SerpentineBelt />
          </>
        )}
        
        {/* Debug: crankshaft centerline - blue axis line */}
        {debugMode && (
          <>
            <DebugLine 
              start={[0, CRANKSHAFT_Y, -BLOCK_LENGTH / 2 - 0.2]} 
              end={[0, CRANKSHAFT_Y, BLOCK_LENGTH / 2 + 0.2]} 
              color="#0088ff" 
            />
            {/* Blue spheres at crankshaft ends */}
            <DebugSphere position={[0, CRANKSHAFT_Y, -BLOCK_LENGTH / 2]} color="#0088ff" size={0.02} />
            <DebugSphere position={[0, CRANKSHAFT_Y, BLOCK_LENGTH / 2]} color="#0088ff" size={0.02} />
            {/* Geometry validation debug panel - shows SBC 350 specs */}
            <GeometryDebugPanel />
            {/* Stroke verification panel - shows travel and deck clearance data */}
            <StrokeVerificationPanel />
          </>
        )}
      </group>
    </DebugContext.Provider>
    </CadModeContext.Provider>
  );
}
