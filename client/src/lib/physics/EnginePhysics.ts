// ============================================================================
// CHEVY 350 SMALL BLOCK V8 - COMPLETE PHYSICS-BASED ENGINE SIMULATION
// All dimensions in SI units (meters, kilograms, seconds, Pascals, Kelvin)
// ============================================================================

// ============================================================================
// UNIT CONVERSIONS
// ============================================================================
const INCH_TO_METER = 0.0254;
const LBM_TO_KG = 0.453592;
const LBF_TO_N = 4.44822;
const PSI_TO_PA = 6894.76;
const CUBIC_INCH_TO_M3 = 1.6387e-5;
const CC_TO_M3 = 1e-6;                              // 1 cc = 1e-6 m³
const HP_TO_WATTS = 745.7;
const LBFT_TO_NM = 1.3558;

// ============================================================================
// CHEVY 350 SMALL BLOCK EXACT SPECIFICATIONS
// ============================================================================
export const ENGINE_SPECS = {
  // Block dimensions
  bore: 4.00 * INCH_TO_METER,                    // 4.000" bore = 0.1016 m
  stroke: 3.48 * INCH_TO_METER,                  // 3.480" stroke = 0.0884 m
  displacement: 350 * CUBIC_INCH_TO_M3,          // 350 cu in = 5.737 L
  displacementPerCylinder: (350 / 8) * CUBIC_INCH_TO_M3, // 43.75 cu in per cylinder
  compressionRatio: 9.5,                          // 9.5:1 typical for 93 octane
  numCylinders: 8,
  vAngle: 90 * (Math.PI / 180),                  // 90° V-angle
  
  // Connecting rod
  rodLength: 5.7 * INCH_TO_METER,                // 5.700" center-to-center = 0.1448 m
  rodMass: 0.595 * LBM_TO_KG,                    // ~595g typical I-beam rod
  rodSmallEndMass: 0.18 * LBM_TO_KG,             // Mass at wrist pin end (reciprocating)
  rodBigEndMass: 0.415 * LBM_TO_KG,              // Mass at crank end (rotating)
  
  // Crankshaft
  crankRadius: (3.48 / 2) * INCH_TO_METER,       // Half stroke = 0.0442 m
  crankMainJournalDia: 2.45 * INCH_TO_METER,     // 2.450" main journal
  crankRodJournalDia: 2.10 * INCH_TO_METER,      // 2.100" rod journal
  crankMass: 50 * LBM_TO_KG,                     // ~50 lbs cast iron crank
  crankMomentOfInertia: 0.12,                    // kg·m² (approximate for 350 crank)
  
  // Piston
  pistonMass: 0.480 * LBM_TO_KG,                 // ~480g hypereutectic piston
  pistonPinMass: 0.120 * LBM_TO_KG,              // ~120g wrist pin
  pistonRingMass: 0.030 * LBM_TO_KG,             // ~30g total ring mass
  pistonCompressionHeight: 1.56 * INCH_TO_METER, // Distance from pin to crown
  pistonSkirtLength: 1.25 * INCH_TO_METER,       // Below pin centerline
  
  // Firing order and crank throws
  firingOrder: [1, 8, 4, 3, 6, 5, 7, 2],
  // Crank throw angles (degrees) for cross-plane V8
  // Pairs fire 90° apart: 1&6, 8&5, 4&7, 3&2
  crankThrowAngles: [0, 270, 90, 180, 180, 90, 270, 0], // Per cylinder position
  
  // Cylinder bank angles (from vertical)
  leftBankAngle: 45 * (Math.PI / 180),           // Left bank (1,3,5,7) tilted 45° 
  rightBankAngle: -45 * (Math.PI / 180),         // Right bank (2,4,6,8) tilted -45°
  
  // Deck height and clearances
  deckHeight: 9.025 * INCH_TO_METER,             // Block deck height
  deckClearance: 0.020 * INCH_TO_METER,          // Piston-to-deck at TDC
  headGasketThickness: 0.040 * INCH_TO_METER,    // Compressed thickness
  combustionChamberVolume: 64 * CC_TO_M3,        // 64cc chambers = 6.4e-5 m³
};

// ============================================================================
// VALVE TRAIN SPECIFICATIONS
// ============================================================================
export const VALVE_SPECS = {
  // Intake valve
  intakeValveDiameter: 1.94 * INCH_TO_METER,     // 1.940" head diameter
  intakeValveStemDia: (11/32) * INCH_TO_METER,   // 11/32" stem = 0.344"
  intakeValveMass: 0.115 * LBM_TO_KG,            // ~115g valve
  intakeMaxLift: 0.525 * INCH_TO_METER,          // 0.350" cam lobe × 1.5 rocker = 0.525"
  
  // Exhaust valve
  exhaustValveDiameter: 1.50 * INCH_TO_METER,    // 1.500" head diameter  
  exhaustValveStemDia: (11/32) * INCH_TO_METER,  // 11/32" stem
  exhaustValveMass: 0.105 * LBM_TO_KG,           // ~105g valve (lighter, sodium-filled)
  exhaustMaxLift: 0.525 * INCH_TO_METER,         // 0.350" cam lobe × 1.5 rocker = 0.525"
  
  // Valve springs (stock replacement)
  springRate: 340 * LBF_TO_N / INCH_TO_METER,    // 340 lbs/in = ~59,500 N/m
  seatPressure: 130 * LBF_TO_N,                  // 130 lbs on seat
  openPressure: 300 * LBF_TO_N,                  // 300 lbs at max lift
  springPreload: 1.78 * INCH_TO_METER,           // Installed height compression
  coilBindHeight: 1.20 * INCH_TO_METER,          // Coil bind point
  
  // Rocker arms
  rockerRatio: 1.5,                              // 1.5:1 stamped steel rockers
  rockerMass: 0.095 * LBM_TO_KG,                 // ~95g per rocker
  
  // Pushrods
  pushrodLength: 7.8 * INCH_TO_METER,            // 7.800" stock length
  pushrodMass: 0.075 * LBM_TO_KG,                // ~75g chromoly pushrod
  
  // Hydraulic lifters
  lifterDiameter: 0.842 * INCH_TO_METER,         // 0.842" OD
  lifterMass: 0.090 * LBM_TO_KG,                 // ~90g hydraulic lifter
  lifterPreload: 0.040 * INCH_TO_METER,          // 0.020-0.060" typical
  
  // Camshaft (stock hydraulic cam)
  camLobeLift: 0.350 * INCH_TO_METER,            // 0.350" lobe lift (user spec)
  camDuration: 270,                               // 270° duration (user spec)
  camLSA: 110,                                    // 110° lobe separation angle (user spec)
  
  // Valve float threshold
  valveFloatRPM: 6200,                           // RPM where valve float begins
  
  // Valve timing events (degrees ATDC for intake, BBDC for exhaust)
  intakeOpens: -4,    // 4° BTDC (before TDC firing)
  intakeCloses: 50,   // 50° ABDC (after BDC)
  exhaustOpens: -64,  // 64° BBDC (before BDC) = 180-64 = 116° ATDC
  exhaustCloses: 16,  // 16° ATDC overlap
  
  // Flow coefficients (Cf at various lift/diameter ratios)
  // Based on typical small block Chevy head flow bench data
  intakeFlowCoeff: [0, 0.15, 0.35, 0.52, 0.62, 0.68, 0.72, 0.74, 0.75], // at L/D 0-0.4
  exhaustFlowCoeff: [0, 0.12, 0.28, 0.42, 0.52, 0.58, 0.62, 0.64, 0.65],
};

// ============================================================================
// 93 OCTANE GASOLINE FUEL PROPERTIES
// ============================================================================
export const FUEL_SPECS = {
  octaneRating: 93,                              // RON+MON/2 = 93 AKI
  stoichAFR: 14.7,                               // Stoichiometric air/fuel ratio
  lowerHeatingValue: 44e6,                       // 44 MJ/kg (J/kg)
  density: 750,                                  // kg/m³ at 15°C
  vaporPressure: 55000,                          // 55 kPa Reid vapor pressure
  autoIgnitionTemp: 553,                         // 280°C = 553K
  flameSpeed: 0.4,                               // ~0.4 m/s laminar flame speed
  
  // Combustion characteristics
  burnDuration: 40,                              // ~40° crank angle for 10-90% burn
  heatReleaseRate: 0.85,                         // Combustion efficiency
  residualGasFraction: 0.06,                     // ~6% residual exhaust in cylinder
};

// ============================================================================
// ATMOSPHERIC & THERMODYNAMIC CONSTANTS
// ============================================================================
export const THERMO_CONSTANTS = {
  // Standard atmosphere
  ambientPressure: 101325,                       // 101.325 kPa (Pa)
  ambientTemp: 298,                              // 25°C = 298K (77°F)
  
  // Gas properties
  airGasConstant: 287,                           // J/(kg·K) for air
  exhaustGasConstant: 290,                       // J/(kg·K) for exhaust
  airDensity: 1.184,                             // kg/m³ at 25°C
  airViscosity: 1.85e-5,                         // Pa·s dynamic viscosity
  
  // Specific heat ratios (gamma)
  gammaAir: 1.4,                                 // Fresh air/fuel mixture
  gammaCompression: 1.35,                        // During compression (with fuel)
  gammaCombustion: 1.25,                         // During/after combustion
  gammaExpansion: 1.30,                          // Expansion stroke average
  gammaExhaust: 1.35,                            // Exhaust gases
  
  // Heat transfer
  cylinderWallTemp: 400,                         // ~127°C = 400K (coolant side)
  pistonCrownTemp: 550,                          // ~277°C = 550K (steady state)
  exhaustValveTemp: 800,                         // ~527°C = 800K
  
  // Woschni heat transfer coefficients
  woschniC1motoring: 2.28,                       // Motoring coefficient
  woschniC1firing: 2.28,                         // Firing coefficient
  woschniC2: 3.24e-3,                            // Combustion coefficient
};

// ============================================================================
// FRICTION MODEL COEFFICIENTS
// ============================================================================
export const FRICTION_SPECS = {
  // Bearing friction (Stribeck curve parameters)
  mainBearingFriction: 0.005,                    // μ at operating temp
  rodBearingFriction: 0.006,                     // μ at operating temp
  
  // Piston ring friction
  ringPack: {
    topRingTension: 15 * LBF_TO_N,               // 15 lbf radial tension
    secondRingTension: 10 * LBF_TO_N,            // 10 lbf
    oilRingTension: 20 * LBF_TO_N,               // 20 lbf (3-piece)
    ringFrictionCoeff: 0.08,                     // With oil film
  },
  
  // Valve train friction  
  camFollowerFriction: 0.10,                     // Cam/lifter interface
  rockerFriction: 0.05,                          // Rocker pivot
  
  // Accessory loads (approximated as constant torque at operating temp)
  oilPumpTorque: 5,                              // N·m
  waterPumpTorque: 3,                            // N·m  
  alteratorTorque: 2,                            // N·m (partial load)
  
  // Pumping losses model (FMEP approximation)
  pumpingLossCoeff: 0.4,                         // bar per 1000 RPM
};

// ============================================================================
// IGNITION SYSTEM SPECIFICATIONS  
// ============================================================================
export const IGNITION_SPECS = {
  // HEI distributor timing curve
  initialTiming: 8,                              // 8° BTDC at idle
  mechanicalAdvance: 24,                         // 24° additional mechanical
  mechanicalAdvanceStart: 800,                   // RPM where advance starts
  mechanicalAdvanceEnd: 3500,                    // RPM where full advance
  vacuumAdvance: 12,                             // 12° additional vacuum advance
  vacuumAdvanceStart: 5 * PSI_TO_PA / 6.895,     // 5" Hg vacuum
  vacuumAdvanceEnd: 15 * PSI_TO_PA / 6.895,      // 15" Hg full vacuum advance
  
  // Spark characteristics
  sparkDuration: 2,                              // 2° crank angle spark duration
  sparkEnergy: 0.040,                            // 40mJ typical HEI energy
  
  // Total timing at WOT
  maxTotalTiming: 32,                            // 32° BTDC at WOT, high RPM
};

// ============================================================================
// CYLINDER STATE CLASS
// ============================================================================
export interface CylinderState {
  cylinderNumber: number;
  bankAngle: number;                             // Radians from vertical
  crankThrowAngle: number;                       // Crank throw offset degrees
  
  // Kinematics
  crankAngle: number;                            // Current crank angle (rad)
  pistonPosition: number;                        // Distance from TDC (m)
  pistonVelocity: number;                        // m/s
  pistonAcceleration: number;                    // m/s²
  
  // Thermodynamic state
  pressure: number;                              // Pa
  temperature: number;                           // K
  mass: number;                                  // kg of gas in cylinder
  volume: number;                                // m³ current volume
  
  // Valve states
  intakeValveLift: number;                       // m
  exhaustValveLift: number;                      // m
  intakeMassFlow: number;                        // kg/s
  exhaustMassFlow: number;                       // kg/s
  
  // Combustion state
  isCombustion: boolean;
  combustionProgress: number;                    // 0-1 mass fraction burned
  heatReleased: number;                          // J cumulative
  sparkTiming: number;                           // Degrees BTDC
  
  // Forces
  gasPressureForce: number;                      // N on piston
  connectingRodForce: number;                    // N along rod
  crankpinTorque: number;                        // N·m contribution
}

// ============================================================================
// ENGINE STATE CLASS
// ============================================================================
export interface EngineState {
  // Crankshaft
  crankAngle: number;                            // Radians (0 = TDC cyl 1)
  crankAngularVelocity: number;                  // rad/s
  crankAngularAcceleration: number;              // rad/s²
  rpm: number;                                   // Revolutions per minute
  
  // Cylinders
  cylinders: CylinderState[];
  
  // Aggregate outputs
  totalTorque: number;                           // N·m instantaneous
  averageTorque: number;                         // N·m averaged over cycle
  power: number;                                 // Watts
  powerHP: number;                               // Horsepower
  brakeTorque: number;                           // N·m after friction
  
  // Thermal state
  coolantTemp: number;                           // K
  oilTemp: number;                               // K
  exhaustGasTemp: number;                        // K (per-cylinder average)
  
  // Intake conditions
  manifoldPressure: number;                      // Pa (MAP)
  manifoldTemp: number;                          // K
  airFuelRatio: number;                          // Current A/F ratio
  
  // Controls
  throttlePosition: number;                      // 0-1
  sparkAdvance: number;                          // Degrees BTDC
}

// ============================================================================
// PHYSICS CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate piston position from crank angle using exact rod geometry
 * @param crankAngle - Crank angle in radians (0 = TDC)
 * @param bankAngle - Bank tilt angle in radians
 * @returns Distance from TDC in meters (positive = down)
 */
export function calculatePistonPosition(crankAngle: number, bankAngle: number = 0): number {
  const r = ENGINE_SPECS.crankRadius;
  const l = ENGINE_SPECS.rodLength;
  
  // Account for bank angle offset on crank angle effect
  const effectiveAngle = crankAngle;
  
  // Standard slider-crank equation:
  // x = r(1 - cos θ) + l(1 - cos φ)
  // where sin φ = (r/l) sin θ
  const sinTheta = Math.sin(effectiveAngle);
  const cosTheta = Math.cos(effectiveAngle);
  const rodRatio = r / l;
  
  // Rod angle from connecting rod geometry
  const sinPhi = rodRatio * sinTheta;
  const cosPhi = Math.sqrt(1 - sinPhi * sinPhi);
  
  // Piston displacement from TDC
  const position = r * (1 - cosTheta) + l * (1 - cosPhi);
  
  return position;
}

/**
 * Calculate piston velocity
 * @param crankAngle - Crank angle in radians
 * @param angularVelocity - Crank angular velocity in rad/s  
 * @returns Piston velocity in m/s (positive = downward)
 */
export function calculatePistonVelocity(crankAngle: number, angularVelocity: number): number {
  const r = ENGINE_SPECS.crankRadius;
  const l = ENGINE_SPECS.rodLength;
  const omega = angularVelocity;
  
  const sinTheta = Math.sin(crankAngle);
  const cosTheta = Math.cos(crankAngle);
  const lambda = r / l; // Rod ratio
  
  // Derivative of position equation
  // v = rω[sin θ + (λ sin 2θ) / (2√(1 - λ²sin²θ))]
  const sinThetaSq = sinTheta * sinTheta;
  const denominator = Math.sqrt(1 - lambda * lambda * sinThetaSq);
  
  const velocity = r * omega * (sinTheta + (lambda * Math.sin(2 * crankAngle)) / (2 * denominator));
  
  return velocity;
}

/**
 * Calculate piston acceleration
 * @param crankAngle - Crank angle in radians
 * @param angularVelocity - Crank angular velocity in rad/s
 * @returns Piston acceleration in m/s²
 */
export function calculatePistonAcceleration(crankAngle: number, angularVelocity: number): number {
  const r = ENGINE_SPECS.crankRadius;
  const l = ENGINE_SPECS.rodLength;
  const omega = angularVelocity;
  const lambda = r / l;
  
  const cosTheta = Math.cos(crankAngle);
  const cos2Theta = Math.cos(2 * crankAngle);
  
  // Simplified acceleration formula (first two terms of Fourier series)
  // a ≈ rω²(cos θ + λ cos 2θ)
  const acceleration = r * omega * omega * (cosTheta + lambda * cos2Theta);
  
  return acceleration;
}

/**
 * Calculate instantaneous cylinder volume
 * @param pistonPosition - Piston position from TDC in meters
 * @returns Cylinder volume in m³
 */
export function calculateCylinderVolume(pistonPosition: number): number {
  const bore = ENGINE_SPECS.bore;
  const boreArea = Math.PI * (bore / 2) ** 2;
  
  // Clearance volume at TDC
  const clearanceVolume = ENGINE_SPECS.displacementPerCylinder / (ENGINE_SPECS.compressionRatio - 1);
  
  // Swept volume based on piston position
  const sweptVolume = boreArea * pistonPosition;
  
  return clearanceVolume + sweptVolume;
}

/**
 * Calculate septic (7th-order) polynomial cam lobe profile
 * Real cams use asymmetric polynomial lift curves, not sine waves
 * 
 * Mathematical note: A true 5th-order polynomial cannot satisfy all required
 * boundary conditions (zero lift, velocity, acceleration at both ends while
 * peaking at mid-stroke). The minimum viable solution is 7th-order (septic).
 * 
 * Profile: P(t) = 64·t³·(1−t)³·(1 + s·(t−0.5))
 * 
 * Properties:
 * - Zero lift at t=0 and t=1 (valve fully closed)
 * - Zero velocity at t=0 and t=1 (smooth start/stop)
 * - Zero acceleration at t=0 and t=1 (jerk-limited)
 * - Peak lift of 1.0 at t≈0.5 (normalized by factor 64)
 * - Asymmetric: faster opening than closing (controlled by parameter s)
 * 
 * @param camDeg - Current camshaft angle in degrees
 * @param centerDeg - Lobe center angle in degrees
 * @returns Lobe lift as fraction of max lift (0-1)
 */
function calculateCamLobeLiftProfile(camDeg: number, centerDeg: number): number {
  const halfDuration = VALVE_SPECS.camDuration / 2;
  
  // Normalize angle to handle wrap-around
  let delta = ((camDeg - centerDeg + 180) % 360) - 180;
  
  // Outside of lobe duration = no lift
  if (Math.abs(delta) > halfDuration) return 0;
  
  // Normalize to 0..1 range where 0 = start of lift, 0.5 = peak, 1 = end of lift
  const t = (delta + halfDuration) / (2 * halfDuration);
  
  // Asymmetry parameter: positive = faster opening than closing
  // s ≈ 0.35 gives realistic SBC cam behavior
  const s = 0.35;
  
  // Septic (7th-order) polynomial: P(t) = 64·t³·(1−t)³·(1 + s·(t−0.5))
  // The 64 factor ensures P(0.5) = 1 when s = 0
  // The t³ and (1-t)³ terms ensure zero lift/velocity/acceleration at boundaries
  const t3 = t * t * t;
  const oneMinusT = 1 - t;
  const oneMinusT3 = oneMinusT * oneMinusT * oneMinusT;
  
  // Base symmetric profile: 64·t³·(1-t)³ peaks at t=0.5 with value 1
  // Asymmetry term: (1 + s·(t-0.5)) biases the curve toward faster opening
  const baseProfile = 64 * t3 * oneMinusT3;
  const asymmetryTerm = 1 + s * (t - 0.5);
  
  const profile = baseProfile * asymmetryTerm;
  
  return Math.max(0, Math.min(1, profile));
}

/**
 * Apply valve float behavior at high RPM
 * At high RPM, valve springs cannot control the valve, causing reduced lift
 * 
 * @param lift - Calculated valve lift in meters
 * @param rpm - Current engine RPM
 * @returns Adjusted valve lift accounting for valve float
 */
function applyValveFloat(lift: number, rpm: number): number {
  const floatRPM = VALVE_SPECS.valveFloatRPM;
  
  if (rpm < floatRPM) return lift;
  
  // Progressive valve float above threshold
  // Complete float at floatRPM + 1500
  const reduction = Math.min(1, (rpm - floatRPM) / 1500);
  return lift * (1 - reduction);
}

/**
 * Calculate intake lobe center based on cylinder firing angle
 * Lobes are separated by LSA (Lobe Separation Angle)
 * 
 * @param firingDeg - Cylinder's firing TDC in cam degrees
 * @returns Intake lobe center in cam degrees
 */
function intakeLobeCenter(firingDeg: number): number {
  return firingDeg - VALVE_SPECS.camLSA / 2;
}

/**
 * Calculate exhaust lobe center based on cylinder firing angle
 * 
 * @param firingDeg - Cylinder's firing TDC in cam degrees  
 * @returns Exhaust lobe center in cam degrees
 */
function exhaustLobeCenter(firingDeg: number): number {
  return firingDeg + VALVE_SPECS.camLSA / 2;
}

/**
 * Calculate valve lift from cam angle using 5th-order polynomial profile
 * This implements the full cam→lifter→pushrod→rocker→valve chain
 * with proper rocker ratio and LSA-based lobe placement
 * 
 * @param camAngle - Camshaft angle in radians (half crank speed)
 * @param isIntake - True for intake valve, false for exhaust
 * @param cylinderOffset - Firing order offset in degrees
 * @param rpm - Engine RPM for valve float calculation (optional)
 * @returns Valve lift in meters
 */
export function calculateValveLift(
  camAngle: number, 
  isIntake: boolean, 
  cylinderOffset: number,
  rpm: number = 0
): number {
  const camDeg = ((camAngle * 180 / Math.PI) % 360 + 360) % 360;
  
  // Convert cylinder offset (crank degrees) to cam degrees
  // Firing offset is based on firing order position * 90° crank = 45° cam
  const firingCamDeg = (cylinderOffset / 2) % 360;
  
  // Get lobe center based on LSA
  const lobeCenter = isIntake 
    ? intakeLobeCenter(firingCamDeg)
    : exhaustLobeCenter(firingCamDeg);
  
  // Calculate cam lobe lift using 5th-order polynomial
  const lobeLiftFraction = calculateCamLobeLiftProfile(camDeg, lobeCenter);
  
  // Apply rocker ratio: valve lift = cam lobe lift × rocker ratio
  const camLobeLift = VALVE_SPECS.camLobeLift;
  const valveLift = lobeLiftFraction * camLobeLift * VALVE_SPECS.rockerRatio;
  
  // Apply valve float at high RPM
  const adjustedLift = applyValveFloat(valveLift, rpm);
  
  return Math.max(0, adjustedLift);
}

/**
 * Calculate valve flow area and mass flow rate
 * @param valveLift - Valve lift in meters
 * @param isIntake - True for intake valve
 * @param upstreamPressure - Pa
 * @param downstreamPressure - Pa
 * @param upstreamTemp - K
 * @returns Mass flow rate in kg/s
 */
export function calculateValveFlow(
  valveLift: number,
  isIntake: boolean,
  upstreamPressure: number,
  downstreamPressure: number,
  upstreamTemp: number
): number {
  if (valveLift <= 0) return 0;
  
  const valveDia = isIntake ? VALVE_SPECS.intakeValveDiameter : VALVE_SPECS.exhaustValveDiameter;
  const flowCoeffs = isIntake ? VALVE_SPECS.intakeFlowCoeff : VALVE_SPECS.exhaustFlowCoeff;
  
  // L/D ratio for flow coefficient lookup
  const ld = valveLift / valveDia;
  const ldIndex = Math.min(Math.floor(ld * 20), flowCoeffs.length - 2);
  const ldFrac = (ld * 20) - ldIndex;
  const flowCoeff = flowCoeffs[ldIndex] + ldFrac * (flowCoeffs[ldIndex + 1] - flowCoeffs[ldIndex]);
  
  // Curtain area
  const curtainArea = Math.PI * valveDia * valveLift;
  const effectiveArea = curtainArea * flowCoeff;
  
  // Pressure ratio
  const pressureRatio = downstreamPressure / upstreamPressure;
  
  // Check for choked flow
  const gamma = THERMO_CONSTANTS.gammaAir;
  const criticalRatio = Math.pow(2 / (gamma + 1), gamma / (gamma - 1));
  
  let massFlow: number;
  const R = THERMO_CONSTANTS.airGasConstant;
  
  if (pressureRatio <= criticalRatio) {
    // Choked flow
    const chokedFlowParam = Math.sqrt(gamma / R) * Math.pow(2 / (gamma + 1), (gamma + 1) / (2 * (gamma - 1)));
    massFlow = effectiveArea * upstreamPressure * chokedFlowParam / Math.sqrt(upstreamTemp);
  } else {
    // Subsonic flow (isentropic)
    const term1 = 2 * gamma / (gamma - 1);
    const term2 = Math.pow(pressureRatio, 2 / gamma) - Math.pow(pressureRatio, (gamma + 1) / gamma);
    massFlow = effectiveArea * upstreamPressure * Math.sqrt(term1 * term2 / (R * upstreamTemp));
  }
  
  return Math.abs(massFlow);
}

/**
 * Calculate Wiebe function for heat release rate
 * @param crankAngle - Current crank angle (degrees ATDC of compression TDC)
 * @param sparkTiming - Spark timing (degrees BTDC)
 * @param burnDuration - Total burn duration in degrees
 * @returns Mass fraction burned (0-1)
 */
export function calculateWiebeBurn(crankAngle: number, sparkTiming: number, burnDuration: number): number {
  const sparkAngle = 360 - sparkTiming; // Convert to ATDC
  const thetaFromSpark = crankAngle - sparkAngle;
  
  if (thetaFromSpark < 0) return 0;
  if (thetaFromSpark > burnDuration) return 1;
  
  // Wiebe function: x = 1 - exp(-a * (θ/θ_d)^(m+1))
  // Typical values: a = 5, m = 2
  const a = 5;
  const m = 2;
  const normalizedAngle = thetaFromSpark / burnDuration;
  
  const massBurned = 1 - Math.exp(-a * Math.pow(normalizedAngle, m + 1));
  
  return massBurned;
}

/**
 * Calculate spark timing with advance curves
 * @param rpm - Engine RPM
 * @param manifoldPressure - Intake manifold pressure (Pa)
 * @param throttle - Throttle position (0-1)
 * @returns Total spark advance in degrees BTDC
 */
export function calculateSparkTiming(rpm: number, manifoldPressure: number, throttle: number): number {
  const specs = IGNITION_SPECS;
  
  // Base timing
  let timing = specs.initialTiming;
  
  // Mechanical advance (RPM-based)
  if (rpm > specs.mechanicalAdvanceStart) {
    const rpmRange = specs.mechanicalAdvanceEnd - specs.mechanicalAdvanceStart;
    const rpmProgress = Math.min((rpm - specs.mechanicalAdvanceStart) / rpmRange, 1);
    timing += specs.mechanicalAdvance * rpmProgress;
  }
  
  // Vacuum advance (only at part throttle)
  if (throttle < 0.8) {
    const vacuum = THERMO_CONSTANTS.ambientPressure - manifoldPressure;
    const vacuumRange = specs.vacuumAdvanceEnd - specs.vacuumAdvanceStart;
    if (vacuum > specs.vacuumAdvanceStart) {
      const vacProgress = Math.min((vacuum - specs.vacuumAdvanceStart) / vacuumRange, 1);
      timing += specs.vacuumAdvance * vacProgress * (1 - throttle);
    }
  }
  
  return Math.min(timing, specs.maxTotalTiming);
}

/**
 * Calculate friction mean effective pressure (FMEP)
 * @param rpm - Engine RPM
 * @param oilTemp - Oil temperature in K
 * @returns FMEP in Pa
 */
export function calculateFrictionLosses(rpm: number, oilTemp: number): number {
  // Chen-Flynn friction model (simplified)
  // FMEP = C0 + C1*p_max + C2*N + C3*N²
  const C0 = 0.35e5;  // Pa constant term
  const C1 = 0.005;   // Peak pressure coefficient
  const C2 = 0.0009e5; // RPM linear term
  const C3 = 0.00001e5; // RPM squared term
  
  const peakPressure = 60e5; // Approximate peak cylinder pressure (60 bar)
  
  const fmep = C0 + C1 * peakPressure + C2 * rpm + C3 * rpm * rpm;
  
  // Temperature correction (friction decreases as oil warms)
  const tempFactor = 1 + 0.002 * (373 - oilTemp); // Reference at 100°C
  
  return fmep * Math.max(0.7, Math.min(1.3, tempFactor));
}

/**
 * Calculate crankpin force from cylinder pressure
 * @param cylinderPressure - Cylinder pressure in Pa
 * @param pistonPosition - Piston position from TDC in m
 * @param crankAngle - Crank angle in radians
 * @returns Object with forces and torque
 */
export function calculateCrankpinForces(
  cylinderPressure: number,
  pistonPosition: number,
  crankAngle: number,
  angularVelocity: number
): { gasForce: number; inertiaForce: number; rodForce: number; torque: number } {
  const bore = ENGINE_SPECS.bore;
  const boreArea = Math.PI * (bore / 2) ** 2;
  const r = ENGINE_SPECS.crankRadius;
  const l = ENGINE_SPECS.rodLength;
  
  // Gas pressure force on piston (positive = pushing down)
  const gasForce = cylinderPressure * boreArea;
  
  // Reciprocating mass
  const recipMass = ENGINE_SPECS.pistonMass + ENGINE_SPECS.pistonPinMass + 
                    ENGINE_SPECS.pistonRingMass + ENGINE_SPECS.rodSmallEndMass;
  
  // Inertia force (F = -ma, positive when decelerating toward TDC)
  const accel = calculatePistonAcceleration(crankAngle, angularVelocity);
  const inertiaForce = -recipMass * accel;
  
  // Net force on piston pin
  const netForce = gasForce + inertiaForce;
  
  // Rod angle
  const sinTheta = Math.sin(crankAngle);
  const lambda = r / l;
  const sinPhi = lambda * sinTheta;
  const cosPhi = Math.sqrt(1 - sinPhi * sinPhi);
  
  // Force along connecting rod
  const rodForce = netForce / cosPhi;
  
  // Tangential force at crankpin
  const tangentForce = rodForce * Math.sin(crankAngle + Math.asin(sinPhi));
  
  // Torque contribution
  const torque = tangentForce * r;
  
  return { gasForce, inertiaForce, rodForce, torque };
}

// ============================================================================
// MAIN ENGINE SIMULATION STEP
// ============================================================================
export function simulateEngineStep(
  state: EngineState,
  dt: number,                                    // Time step in seconds
  externalLoad: number                           // External load torque in N·m
): EngineState {
  const newState = { ...state };
  
  // Update crank angle
  const dTheta = state.crankAngularVelocity * dt;
  newState.crankAngle = (state.crankAngle + dTheta) % (4 * Math.PI); // 720° = 4π for 4-stroke
  
  // Calculate manifold pressure from throttle (improved model)
  // At idle (0% throttle), MAP is ~30-40 kPa (high vacuum)
  // At WOT (100% throttle), MAP approaches ambient (~100 kPa)
  // Non-linear throttle response (butterfly valve characteristic)
  const throttleAngle = state.throttlePosition * 0.5 * Math.PI; // 0 to 90 degrees
  const throttleFlow = Math.sin(throttleAngle) * Math.sin(throttleAngle); // sin² for realistic response
  const minMAP = 0.3; // 30% of ambient at closed throttle (vacuum)
  const maxMAP = 0.98; // 98% of ambient at WOT (slight restriction)
  const mapRatio = minMAP + (maxMAP - minMAP) * throttleFlow;
  newState.manifoldPressure = THERMO_CONSTANTS.ambientPressure * mapRatio;
  
  // Calculate spark timing
  newState.sparkAdvance = calculateSparkTiming(state.rpm, newState.manifoldPressure, state.throttlePosition);
  
  // Update each cylinder
  let totalTorque = 0;
  const camAngle = newState.crankAngle / 2; // Cam runs at half speed
  
  newState.cylinders = state.cylinders.map((cyl, i) => {
    const newCyl = { ...cyl };
    
    // Cylinder-specific crank angle (with throw offset)
    const throwOffset = ENGINE_SPECS.crankThrowAngles[i] * Math.PI / 180;
    const effectiveCrankAngle = (newState.crankAngle + throwOffset) % (4 * Math.PI);
    const crankDeg = (effectiveCrankAngle * 180 / Math.PI) % 720;
    newCyl.crankAngle = effectiveCrankAngle;
    
    // Piston kinematics
    newCyl.pistonPosition = calculatePistonPosition(effectiveCrankAngle, cyl.bankAngle);
    newCyl.pistonVelocity = calculatePistonVelocity(effectiveCrankAngle, state.crankAngularVelocity);
    newCyl.pistonAcceleration = calculatePistonAcceleration(effectiveCrankAngle, state.crankAngularVelocity);
    
    // Cylinder volume
    newCyl.volume = calculateCylinderVolume(newCyl.pistonPosition);
    
    // Valve lifts (with RPM for valve float calculation)
    const firingOffset = ENGINE_SPECS.firingOrder.indexOf(i + 1) * 90;
    newCyl.intakeValveLift = calculateValveLift(camAngle, true, firingOffset, state.rpm);
    newCyl.exhaustValveLift = calculateValveLift(camAngle, false, firingOffset, state.rpm);
    
    // Determine stroke phase (0-180: power, 180-360: exhaust, 360-540: intake, 540-720: compression)
    const strokePhase = Math.floor(crankDeg / 180);
    
    // Gas exchange and thermodynamics
    if (newCyl.intakeValveLift > 0 && newState.manifoldPressure > newCyl.pressure) {
      // Intake flow (only when manifold pressure exceeds cylinder pressure)
      const flow = calculateValveFlow(
        newCyl.intakeValveLift,
        true,
        newState.manifoldPressure,
        newCyl.pressure,
        newState.manifoldTemp
      );
      newCyl.intakeMassFlow = flow;
      
      // Store previous mass for proper mixing calculation
      const prevMass = newCyl.mass;
      const massAdded = flow * dt;
      newCyl.mass = prevMass + massAdded;
      
      // Mix with incoming air (clamp mixRatio to prevent instabilities)
      const mixRatio = Math.min(0.8, massAdded / newCyl.mass);
      newCyl.temperature = newCyl.temperature * (1 - mixRatio) + newState.manifoldTemp * mixRatio;
    }
    
    if (newCyl.exhaustValveLift > 0 && newCyl.pressure > THERMO_CONSTANTS.ambientPressure) {
      // Exhaust flow (only when cylinder pressure exceeds ambient)
      const flow = calculateValveFlow(
        newCyl.exhaustValveLift,
        false,
        newCyl.pressure,
        THERMO_CONSTANTS.ambientPressure,
        newCyl.temperature
      );
      newCyl.exhaustMassFlow = flow;
      
      // Minimum mass floor to prevent numerical instabilities
      const minMass = (THERMO_CONSTANTS.ambientPressure * calculateCylinderVolume(0)) / 
                      (THERMO_CONSTANTS.airGasConstant * 1000); // Very small residual
      newCyl.mass = Math.max(newCyl.mass - flow * dt, minMass);
    }
    
    // Compression/expansion (polytropic process)
    if (newCyl.intakeValveLift === 0 && newCyl.exhaustValveLift === 0) {
      const prevVolume = calculateCylinderVolume(cyl.pistonPosition);
      if (prevVolume > 0 && newCyl.volume > 0 && newCyl.mass > 0) {
        const gamma = newCyl.isCombustion ? THERMO_CONSTANTS.gammaCombustion : THERMO_CONSTANTS.gammaCompression;
        const volumeRatio = prevVolume / newCyl.volume;
        
        // PV^γ = constant for isentropic process
        newCyl.pressure = cyl.pressure * Math.pow(volumeRatio, gamma);
        newCyl.temperature = cyl.temperature * Math.pow(volumeRatio, gamma - 1);
      }
    }
    
    // Ideal gas law to maintain consistency
    if (newCyl.mass > 0 && newCyl.volume > 0) {
      newCyl.pressure = (newCyl.mass * THERMO_CONSTANTS.airGasConstant * newCyl.temperature) / newCyl.volume;
    }
    
    // Combustion - ONLY allowed when both valves are closed (real engine behavior)
    // This gates combustion on valve closure per the user's engineering spec
    const valvesClosed = newCyl.intakeValveLift < 0.001 && newCyl.exhaustValveLift < 0.001;
    
    const sparkAngle = 360 - newState.sparkAdvance;
    if (crankDeg >= sparkAngle - 5 && crankDeg < sparkAngle + FUEL_SPECS.burnDuration && strokePhase < 1 && valvesClosed) {
      if (!newCyl.isCombustion && crankDeg >= sparkAngle) {
        newCyl.isCombustion = true;
        newCyl.combustionProgress = 0;
      }
      
      if (newCyl.isCombustion) {
        const newProgress = calculateWiebeBurn(crankDeg, newState.sparkAdvance, FUEL_SPECS.burnDuration);
        const burnIncrement = newProgress - newCyl.combustionProgress;
        
        if (burnIncrement > 0) {
          // Heat release
          const fuelMass = newCyl.mass / (FUEL_SPECS.stoichAFR + 1);
          const totalHeat = fuelMass * FUEL_SPECS.lowerHeatingValue * FUEL_SPECS.heatReleaseRate;
          const heatAdded = totalHeat * burnIncrement;
          
          newCyl.heatReleased += heatAdded;
          newCyl.combustionProgress = newProgress;
          
          // Temperature rise from heat addition (constant volume approximation)
          const Cv = THERMO_CONSTANTS.airGasConstant / (THERMO_CONSTANTS.gammaCombustion - 1);
          newCyl.temperature += heatAdded / (newCyl.mass * Cv);
          
          // Update pressure via ideal gas law
          newCyl.pressure = (newCyl.mass * THERMO_CONSTANTS.airGasConstant * newCyl.temperature) / newCyl.volume;
        }
      }
    } else if (crankDeg >= 360) {
      // Reset combustion state for next cycle
      newCyl.isCombustion = false;
      newCyl.combustionProgress = 0;
      newCyl.heatReleased = 0;
    }
    
    // Calculate crankpin forces and torque
    const forces = calculateCrankpinForces(
      newCyl.pressure,
      newCyl.pistonPosition,
      effectiveCrankAngle,
      state.crankAngularVelocity
    );
    
    newCyl.gasPressureForce = forces.gasForce;
    newCyl.connectingRodForce = forces.rodForce;
    newCyl.crankpinTorque = forces.torque;
    
    totalTorque += forces.torque;
    
    return newCyl;
  });
  
  // Friction losses
  const fmep = calculateFrictionLosses(state.rpm, newState.oilTemp);
  const frictionTorque = fmep * ENGINE_SPECS.displacement / (4 * Math.PI); // FMEP to torque
  
  // Accessory loads
  const accessoryTorque = FRICTION_SPECS.oilPumpTorque + FRICTION_SPECS.waterPumpTorque + FRICTION_SPECS.alteratorTorque;
  
  // Net torque
  newState.totalTorque = totalTorque;
  newState.brakeTorque = totalTorque - frictionTorque - accessoryTorque - externalLoad;
  
  // Angular acceleration (τ = Iα)
  newState.crankAngularAcceleration = newState.brakeTorque / ENGINE_SPECS.crankMomentOfInertia;
  
  // Update angular velocity
  newState.crankAngularVelocity = Math.max(0, state.crankAngularVelocity + newState.crankAngularAcceleration * dt);
  
  // Calculate RPM
  newState.rpm = (newState.crankAngularVelocity * 60) / (2 * Math.PI);
  
  // Calculate power
  newState.power = newState.brakeTorque * newState.crankAngularVelocity;
  newState.powerHP = newState.power / HP_TO_WATTS;
  
  // Thermal updates (simplified)
  const heatGenerated = frictionTorque * newState.crankAngularVelocity * dt;
  newState.oilTemp = Math.min(400, newState.oilTemp + heatGenerated * 0.0001);
  newState.coolantTemp = Math.min(380, newState.coolantTemp + heatGenerated * 0.00005);
  
  return newState;
}

// ============================================================================
// INITIAL STATE FACTORY
// ============================================================================
export function createInitialEngineState(): EngineState {
  const cylinders: CylinderState[] = [];
  
  // Calculate proper clearance volume at TDC
  const clearanceVolume = ENGINE_SPECS.displacementPerCylinder / (ENGINE_SPECS.compressionRatio - 1);
  
  for (let i = 0; i < 8; i++) {
    // Cylinders 1,3,5,7 on left bank, 2,4,6,8 on right bank
    const isLeftBank = (i + 1) % 2 === 1;
    const bankAngle = isLeftBank ? ENGINE_SPECS.leftBankAngle : ENGINE_SPECS.rightBankAngle;
    
    // Each cylinder starts at different phase based on throw angle
    const throwOffset = ENGINE_SPECS.crankThrowAngles[i] * Math.PI / 180;
    const initialPistonPos = calculatePistonPosition(throwOffset, bankAngle);
    const initialVolume = calculateCylinderVolume(initialPistonPos);
    
    // Initial mass from ideal gas law at ambient conditions
    const initialMass = (THERMO_CONSTANTS.ambientPressure * initialVolume) / 
                        (THERMO_CONSTANTS.airGasConstant * THERMO_CONSTANTS.ambientTemp);
    
    cylinders.push({
      cylinderNumber: i + 1,
      bankAngle,
      crankThrowAngle: ENGINE_SPECS.crankThrowAngles[i],
      crankAngle: throwOffset,
      pistonPosition: initialPistonPos,
      pistonVelocity: 0,
      pistonAcceleration: 0,
      pressure: THERMO_CONSTANTS.ambientPressure,
      temperature: THERMO_CONSTANTS.ambientTemp,
      mass: initialMass,
      volume: initialVolume,
      intakeValveLift: 0,
      exhaustValveLift: 0,
      intakeMassFlow: 0,
      exhaustMassFlow: 0,
      isCombustion: false,
      combustionProgress: 0,
      heatReleased: 0,
      sparkTiming: IGNITION_SPECS.initialTiming,
      gasPressureForce: 0,
      connectingRodForce: 0,
      crankpinTorque: 0,
    });
  }
  
  return {
    crankAngle: 0,
    crankAngularVelocity: (800 * 2 * Math.PI) / 60, // Start at 800 RPM for starter motor
    crankAngularAcceleration: 0,
    rpm: 800,
    cylinders,
    totalTorque: 0,
    averageTorque: 0,
    power: 0,
    powerHP: 0,
    brakeTorque: 0,
    coolantTemp: THERMO_CONSTANTS.ambientTemp + 50, // Warmed up
    oilTemp: THERMO_CONSTANTS.ambientTemp + 40,
    exhaustGasTemp: 600,
    manifoldPressure: THERMO_CONSTANTS.ambientPressure * 0.4, // Idle vacuum (~40 kPa)
    manifoldTemp: THERMO_CONSTANTS.ambientTemp + 20,
    airFuelRatio: FUEL_SPECS.stoichAFR,
    throttlePosition: 0.15, // Idle throttle
    sparkAdvance: IGNITION_SPECS.initialTiming,
  };
}
