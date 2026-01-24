// ============================================================================
// CHEVY 350 SMALL BLOCK - MATERIAL PROPERTIES DATABASE
// All materials with exact properties for stress/fatigue simulation
// ============================================================================

// Unit conversions
const PSI_TO_PA = 6894.76;
const LBM_TO_KG = 0.453592;

// ============================================================================
// MATERIAL TYPE DEFINITIONS
// ============================================================================
export interface MaterialProperties {
  name: string;
  type: 'cast_iron' | 'forged_steel' | 'aluminum' | 'chromoly' | 'ductile_iron';
  
  // Mechanical properties
  tensileStrength: number;      // Pa - Ultimate tensile strength
  yieldStrength: number;        // Pa - Yield strength
  fatigueLimit: number;         // Pa - Endurance limit (10^7 cycles)
  elasticModulus: number;       // Pa - Young's modulus
  shearModulus: number;         // Pa - Shear modulus
  poissonsRatio: number;        // Dimensionless
  
  // Thermal properties
  thermalExpansion: number;     // 1/K - Coefficient of linear expansion
  thermalConductivity: number;  // W/(m·K)
  specificHeat: number;         // J/(kg·K)
  meltingPoint: number;         // K
  
  // Physical properties
  density: number;              // kg/m³
  hardness: number;             // Brinell (HB) or Rockwell (HRC)
  hardnessScale: 'HB' | 'HRC';
  
  // Color for visualization
  color: string;
  metalness: number;
  roughness: number;
}

// ============================================================================
// CHEVY 350 COMPONENT MATERIALS
// ============================================================================

export const MATERIALS: Record<string, MaterialProperties> = {
  // Engine Block - Class 30 Gray Cast Iron
  BLOCK_CAST_IRON: {
    name: 'Class 30 Gray Cast Iron',
    type: 'cast_iron',
    tensileStrength: 30000 * PSI_TO_PA,           // 30,000 psi
    yieldStrength: 21000 * PSI_TO_PA,             // ~70% of tensile
    fatigueLimit: 14000 * PSI_TO_PA,              // ~47% of tensile
    elasticModulus: 15e6 * PSI_TO_PA,             // 15 Msi
    shearModulus: 6.2e6 * PSI_TO_PA,              // 6.2 Msi
    poissonsRatio: 0.26,
    thermalExpansion: 10.8e-6,                     // 10.8 µin/in/°F → ~6e-6/°C
    thermalConductivity: 46,                       // W/(m·K)
    specificHeat: 490,                             // J/(kg·K)
    meltingPoint: 1423,                            // ~1150°C
    density: 7200,                                 // kg/m³
    hardness: 200,
    hardnessScale: 'HB',
    color: '#4a4a4a',
    metalness: 0.7,
    roughness: 0.4,
  },

  // Crankshaft - Forged 1053 Steel (nodular/ductile iron for stock)
  CRANK_FORGED_STEEL: {
    name: '1053 Forged Steel',
    type: 'forged_steel',
    tensileStrength: 100000 * PSI_TO_PA,          // 100,000 psi
    yieldStrength: 75000 * PSI_TO_PA,             // 75,000 psi
    fatigueLimit: 50000 * PSI_TO_PA,              // 50% of tensile
    elasticModulus: 30e6 * PSI_TO_PA,             // 30 Msi
    shearModulus: 11.5e6 * PSI_TO_PA,             // 11.5 Msi
    poissonsRatio: 0.29,
    thermalExpansion: 11.7e-6,
    thermalConductivity: 51.9,
    specificHeat: 486,
    meltingPoint: 1723,                            // ~1450°C
    density: 7850,
    hardness: 28,
    hardnessScale: 'HRC',
    color: '#3d3d3d',
    metalness: 0.95,
    roughness: 0.1,
  },

  // Connecting Rods - Forged 4340 Steel
  ROD_4340_STEEL: {
    name: '4340 Forged Steel',
    type: 'forged_steel',
    tensileStrength: 145000 * PSI_TO_PA,          // 145,000 psi
    yieldStrength: 130000 * PSI_TO_PA,            // 130,000 psi
    fatigueLimit: 70000 * PSI_TO_PA,              // High fatigue resistance
    elasticModulus: 29e6 * PSI_TO_PA,             // 29 Msi
    shearModulus: 11.2e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 12.3e-6,
    thermalConductivity: 44.5,
    specificHeat: 475,
    meltingPoint: 1700,
    density: 7850,
    hardness: 32,
    hardnessScale: 'HRC',
    color: '#555555',
    metalness: 0.92,
    roughness: 0.12,
  },

  // Pistons - 4032-T6 Aluminum (hypereutectic)
  PISTON_ALUMINUM: {
    name: '4032-T6 Hypereutectic Aluminum',
    type: 'aluminum',
    tensileStrength: 55000 * PSI_TO_PA,           // 55,000 psi
    yieldStrength: 46000 * PSI_TO_PA,             // 46,000 psi
    fatigueLimit: 17000 * PSI_TO_PA,              // ~31% of tensile
    elasticModulus: 11.2e6 * PSI_TO_PA,           // 11.2 Msi
    shearModulus: 4.0e6 * PSI_TO_PA,
    poissonsRatio: 0.33,
    thermalExpansion: 19.4e-6,                     // Higher than iron - expansion control important
    thermalConductivity: 138,                      // Good heat dissipation
    specificHeat: 880,
    meltingPoint: 845,                             // ~572°C - lower than iron
    density: 2710,                                 // Light weight
    hardness: 120,
    hardnessScale: 'HB',
    color: '#b8b8b8',
    metalness: 0.95,
    roughness: 0.08,
  },

  // Piston Rings - Ductile Iron with Chrome Face (top ring)
  RING_CHROME: {
    name: 'Chrome-Faced Ductile Iron',
    type: 'ductile_iron',
    tensileStrength: 80000 * PSI_TO_PA,
    yieldStrength: 55000 * PSI_TO_PA,
    fatigueLimit: 35000 * PSI_TO_PA,
    elasticModulus: 24e6 * PSI_TO_PA,
    shearModulus: 9.3e6 * PSI_TO_PA,
    poissonsRatio: 0.28,
    thermalExpansion: 12.6e-6,
    thermalConductivity: 36,
    specificHeat: 460,
    meltingPoint: 1420,
    density: 7100,
    hardness: 95,
    hardnessScale: 'HB',
    color: '#c0c0c0',
    metalness: 0.98,
    roughness: 0.02,
  },

  // Second Compression Ring - Plain Cast Iron
  RING_CAST_IRON: {
    name: 'Cast Iron Ring',
    type: 'cast_iron',
    tensileStrength: 35000 * PSI_TO_PA,
    yieldStrength: 24000 * PSI_TO_PA,
    fatigueLimit: 15000 * PSI_TO_PA,
    elasticModulus: 15e6 * PSI_TO_PA,
    shearModulus: 6.0e6 * PSI_TO_PA,
    poissonsRatio: 0.26,
    thermalExpansion: 10.8e-6,
    thermalConductivity: 46,
    specificHeat: 490,
    meltingPoint: 1423,
    density: 7200,
    hardness: 100,
    hardnessScale: 'HB',
    color: '#505050',
    metalness: 0.9,
    roughness: 0.15,
  },

  // Oil Control Ring - Stainless Steel Rails
  RING_STAINLESS: {
    name: 'Stainless Steel Oil Ring',
    type: 'forged_steel',
    tensileStrength: 90000 * PSI_TO_PA,
    yieldStrength: 60000 * PSI_TO_PA,
    fatigueLimit: 40000 * PSI_TO_PA,
    elasticModulus: 28e6 * PSI_TO_PA,
    shearModulus: 11e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 17.3e-6,
    thermalConductivity: 16,
    specificHeat: 500,
    meltingPoint: 1700,
    density: 7800,
    hardness: 40,
    hardnessScale: 'HRC',
    color: '#404040',
    metalness: 0.85,
    roughness: 0.2,
  },

  // Wrist Pin - 52100 Bearing Steel (case hardened)
  WRIST_PIN_STEEL: {
    name: '52100 Bearing Steel',
    type: 'forged_steel',
    tensileStrength: 320000 * PSI_TO_PA,          // Very high - case hardened
    yieldStrength: 295000 * PSI_TO_PA,
    fatigueLimit: 95000 * PSI_TO_PA,
    elasticModulus: 30e6 * PSI_TO_PA,
    shearModulus: 11.8e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 11.9e-6,
    thermalConductivity: 46.6,
    specificHeat: 475,
    meltingPoint: 1700,
    density: 7830,
    hardness: 62,
    hardnessScale: 'HRC',
    color: '#a0a0a0',
    metalness: 0.98,
    roughness: 0.03,
  },

  // Cylinder Head - Cast Iron (stock) or Aluminum (aftermarket)
  HEAD_CAST_IRON: {
    name: 'Cast Iron Cylinder Head',
    type: 'cast_iron',
    tensileStrength: 35000 * PSI_TO_PA,
    yieldStrength: 25000 * PSI_TO_PA,
    fatigueLimit: 16000 * PSI_TO_PA,
    elasticModulus: 15e6 * PSI_TO_PA,
    shearModulus: 6.0e6 * PSI_TO_PA,
    poissonsRatio: 0.26,
    thermalExpansion: 10.8e-6,
    thermalConductivity: 46,
    specificHeat: 490,
    meltingPoint: 1423,
    density: 7200,
    hardness: 200,
    hardnessScale: 'HB',
    color: '#5a5a5a',
    metalness: 0.75,
    roughness: 0.35,
  },

  // Camshaft - Chilled Cast Iron with hardened lobes
  CAMSHAFT_IRON: {
    name: 'Chilled Cast Iron Camshaft',
    type: 'cast_iron',
    tensileStrength: 40000 * PSI_TO_PA,
    yieldStrength: 28000 * PSI_TO_PA,
    fatigueLimit: 18000 * PSI_TO_PA,
    elasticModulus: 17e6 * PSI_TO_PA,
    shearModulus: 6.8e6 * PSI_TO_PA,
    poissonsRatio: 0.26,
    thermalExpansion: 10.5e-6,
    thermalConductivity: 48,
    specificHeat: 490,
    meltingPoint: 1423,
    density: 7300,
    hardness: 55,
    hardnessScale: 'HRC',
    color: '#3a3a3a',
    metalness: 0.9,
    roughness: 0.1,
  },

  // Pushrods - 4130 Chromoly Steel
  PUSHROD_CHROMOLY: {
    name: '4130 Chromoly Steel',
    type: 'chromoly',
    tensileStrength: 97000 * PSI_TO_PA,
    yieldStrength: 63000 * PSI_TO_PA,
    fatigueLimit: 45000 * PSI_TO_PA,
    elasticModulus: 29e6 * PSI_TO_PA,
    shearModulus: 11.2e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 12.2e-6,
    thermalConductivity: 42,
    specificHeat: 477,
    meltingPoint: 1700,
    density: 7850,
    hardness: 25,
    hardnessScale: 'HRC',
    color: '#707070',
    metalness: 0.88,
    roughness: 0.18,
  },

  // Rocker Arms - Stamped Steel (stock)
  ROCKER_STEEL: {
    name: 'Stamped Steel Rocker',
    type: 'forged_steel',
    tensileStrength: 65000 * PSI_TO_PA,
    yieldStrength: 45000 * PSI_TO_PA,
    fatigueLimit: 28000 * PSI_TO_PA,
    elasticModulus: 29e6 * PSI_TO_PA,
    shearModulus: 11.2e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 11.7e-6,
    thermalConductivity: 51.9,
    specificHeat: 486,
    meltingPoint: 1700,
    density: 7850,
    hardness: 20,
    hardnessScale: 'HRC',
    color: '#606060',
    metalness: 0.85,
    roughness: 0.2,
  },

  // Valves - Intake (Stainless Steel)
  VALVE_INTAKE: {
    name: 'Stainless Steel Intake Valve',
    type: 'forged_steel',
    tensileStrength: 115000 * PSI_TO_PA,
    yieldStrength: 80000 * PSI_TO_PA,
    fatigueLimit: 50000 * PSI_TO_PA,
    elasticModulus: 28e6 * PSI_TO_PA,
    shearModulus: 11e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 17.3e-6,
    thermalConductivity: 24,
    specificHeat: 500,
    meltingPoint: 1700,
    density: 7900,
    hardness: 35,
    hardnessScale: 'HRC',
    color: '#8a8a8a',
    metalness: 0.92,
    roughness: 0.1,
  },

  // Valves - Exhaust (Sodium-filled Stainless)
  VALVE_EXHAUST: {
    name: 'Sodium-Filled Exhaust Valve',
    type: 'forged_steel',
    tensileStrength: 130000 * PSI_TO_PA,
    yieldStrength: 95000 * PSI_TO_PA,
    fatigueLimit: 55000 * PSI_TO_PA,
    elasticModulus: 28e6 * PSI_TO_PA,
    shearModulus: 11e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 18.0e-6,
    thermalConductivity: 35,                       // Higher due to sodium filling
    specificHeat: 520,
    meltingPoint: 1700,
    density: 7700,                                 // Slightly less due to hollow stem
    hardness: 38,
    hardnessScale: 'HRC',
    color: '#757575',
    metalness: 0.88,
    roughness: 0.15,
  },

  // Valve Springs - Chrome Silicon Steel
  VALVE_SPRING: {
    name: 'Chrome Silicon Spring Steel',
    type: 'chromoly',
    tensileStrength: 245000 * PSI_TO_PA,
    yieldStrength: 220000 * PSI_TO_PA,
    fatigueLimit: 75000 * PSI_TO_PA,
    elasticModulus: 30e6 * PSI_TO_PA,
    shearModulus: 11.5e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 11.0e-6,
    thermalConductivity: 38,
    specificHeat: 460,
    meltingPoint: 1700,
    density: 7800,
    hardness: 50,
    hardnessScale: 'HRC',
    color: '#484848',
    metalness: 0.8,
    roughness: 0.25,
  },

  // Hydraulic Lifters - Case Hardened Steel
  LIFTER_STEEL: {
    name: 'Case Hardened Lifter Steel',
    type: 'forged_steel',
    tensileStrength: 180000 * PSI_TO_PA,
    yieldStrength: 160000 * PSI_TO_PA,
    fatigueLimit: 80000 * PSI_TO_PA,
    elasticModulus: 30e6 * PSI_TO_PA,
    shearModulus: 11.5e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 11.7e-6,
    thermalConductivity: 46,
    specificHeat: 475,
    meltingPoint: 1700,
    density: 7850,
    hardness: 58,
    hardnessScale: 'HRC',
    color: '#5a5a5a',
    metalness: 0.9,
    roughness: 0.08,
  },

  // Head Gasket - Multi-layer Steel (MLS)
  HEAD_GASKET: {
    name: 'Multi-Layer Steel Gasket',
    type: 'forged_steel',
    tensileStrength: 75000 * PSI_TO_PA,
    yieldStrength: 50000 * PSI_TO_PA,
    fatigueLimit: 30000 * PSI_TO_PA,
    elasticModulus: 29e6 * PSI_TO_PA,
    shearModulus: 11e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 12.0e-6,
    thermalConductivity: 45,
    specificHeat: 480,
    meltingPoint: 1700,
    density: 7800,
    hardness: 25,
    hardnessScale: 'HRC',
    color: '#4d4d4d',
    metalness: 0.7,
    roughness: 0.3,
  },

  // Rod Bearing - Tri-metal (Steel back, copper-lead, babbitt overlay)
  BEARING_SHELL: {
    name: 'Tri-Metal Bearing Shell',
    type: 'aluminum',  // Closest approximation for bearing material
    tensileStrength: 35000 * PSI_TO_PA,
    yieldStrength: 20000 * PSI_TO_PA,
    fatigueLimit: 12000 * PSI_TO_PA,
    elasticModulus: 15e6 * PSI_TO_PA,
    shearModulus: 5.5e6 * PSI_TO_PA,
    poissonsRatio: 0.33,
    thermalExpansion: 20e-6,
    thermalConductivity: 50,
    specificHeat: 385,
    meltingPoint: 600,                             // Babbitt melts around 327°C
    density: 8500,
    hardness: 25,
    hardnessScale: 'HB',
    color: '#b8860b',                              // Copper/bronze color
    metalness: 0.85,
    roughness: 0.15,
  },

  // Timing Chain - Roller Chain Steel
  TIMING_CHAIN: {
    name: 'Roller Chain Steel',
    type: 'forged_steel',
    tensileStrength: 120000 * PSI_TO_PA,
    yieldStrength: 90000 * PSI_TO_PA,
    fatigueLimit: 55000 * PSI_TO_PA,
    elasticModulus: 29e6 * PSI_TO_PA,
    shearModulus: 11e6 * PSI_TO_PA,
    poissonsRatio: 0.29,
    thermalExpansion: 11.7e-6,
    thermalConductivity: 50,
    specificHeat: 475,
    meltingPoint: 1700,
    density: 7850,
    hardness: 45,
    hardnessScale: 'HRC',
    color: '#2a2a2a',
    metalness: 0.9,
    roughness: 0.15,
  },
};

// ============================================================================
// COMPONENT-TO-MATERIAL MAPPING
// ============================================================================
export const COMPONENT_MATERIALS: Record<string, MaterialProperties> = {
  block: MATERIALS.BLOCK_CAST_IRON,
  crankshaft: MATERIALS.CRANK_FORGED_STEEL,
  connectingRod: MATERIALS.ROD_4340_STEEL,
  piston: MATERIALS.PISTON_ALUMINUM,
  topRing: MATERIALS.RING_CHROME,
  secondRing: MATERIALS.RING_CAST_IRON,
  oilRing: MATERIALS.RING_STAINLESS,
  wristPin: MATERIALS.WRIST_PIN_STEEL,
  cylinderHead: MATERIALS.HEAD_CAST_IRON,
  camshaft: MATERIALS.CAMSHAFT_IRON,
  pushrod: MATERIALS.PUSHROD_CHROMOLY,
  rockerArm: MATERIALS.ROCKER_STEEL,
  intakeValve: MATERIALS.VALVE_INTAKE,
  exhaustValve: MATERIALS.VALVE_EXHAUST,
  valveSpring: MATERIALS.VALVE_SPRING,
  lifter: MATERIALS.LIFTER_STEEL,
  headGasket: MATERIALS.HEAD_GASKET,
  bearingShell: MATERIALS.BEARING_SHELL,
  timingChain: MATERIALS.TIMING_CHAIN,
};

// ============================================================================
// CLEARANCE SPECIFICATIONS (Chevy 350)
// ============================================================================
export const CLEARANCES = {
  // Piston to wall clearance
  pistonToWall: {
    cold: 0.0015,               // 0.0015" cold clearance (aluminum piston)
    hot: 0.0008,                // Closes to ~0.0008" at operating temp
    minAllowed: 0.0010,         // Minimum safe clearance
    maxAllowed: 0.0025,         // Maximum before ring seal issues
  },

  // Ring gaps (measured at bore diameter)
  topRingGap: {
    min: 0.016,                 // 0.016" minimum (4" per inch of bore)
    max: 0.024,                 // 0.024" maximum
    recommended: 0.020,         // 0.020" recommended
  },
  secondRingGap: {
    min: 0.018,                 // Slightly larger than top ring
    max: 0.026,
    recommended: 0.022,
  },
  oilRingGap: {
    min: 0.015,
    max: 0.055,                 // Oil rings more tolerant
    recommended: 0.025,
  },

  // Ring side clearance (in groove)
  topRingSide: {
    min: 0.0015,
    max: 0.0035,
    recommended: 0.002,
  },
  secondRingSide: {
    min: 0.0015,
    max: 0.0035,
    recommended: 0.002,
  },
  oilRingSide: {
    min: 0.001,
    max: 0.005,
    recommended: 0.002,
  },

  // Rod bearing clearance
  rodBearing: {
    min: 0.0010,
    max: 0.0025,
    recommended: 0.0015,
  },

  // Main bearing clearance
  mainBearing: {
    min: 0.0010,
    max: 0.0025,
    recommended: 0.002,
  },

  // Piston to valve clearance
  pistonToIntakeValve: {
    min: 0.080,                 // 0.080" minimum
    recommended: 0.100,
  },
  pistonToExhaustValve: {
    min: 0.100,                 // 0.100" minimum (exhaust runs hotter)
    recommended: 0.120,
  },

  // Piston to head (deck clearance)
  pistonToDeck: {
    min: 0.000,                 // Zero deck acceptable with proper gasket
    max: 0.025,                 // Max before excessive quench
    recommended: 0.020,
  },
};

// ============================================================================
// STRESS CALCULATION HELPERS
// ============================================================================
export function calculateStressRatio(currentStress: number, material: MaterialProperties): number {
  return currentStress / material.yieldStrength;
}

export function calculateFatigueSafety(cyclicStress: number, material: MaterialProperties): number {
  return material.fatigueLimit / cyclicStress;
}

export function isOverStressed(currentStress: number, material: MaterialProperties): boolean {
  return currentStress > material.yieldStrength;
}

export function getStressColor(stressRatio: number): string {
  if (stressRatio < 0.5) return '#00ff00';      // Green - safe
  if (stressRatio < 0.75) return '#ffff00';     // Yellow - caution
  if (stressRatio < 0.9) return '#ff8800';      // Orange - warning
  return '#ff0000';                              // Red - danger
}

// ============================================================================
// THERMAL EXPANSION CALCULATIONS
// ============================================================================
export function calculateThermalExpansion(
  originalDimension: number, 
  deltaTemp: number, 
  material: MaterialProperties
): number {
  return originalDimension * material.thermalExpansion * deltaTemp;
}

export function calculateHotClearance(
  coldClearance: number,
  boreDiameter: number,
  pistonDiameter: number,
  blockTemp: number,
  pistonTemp: number,
  ambientTemp: number = 293 // 20°C
): number {
  const blockExpansion = calculateThermalExpansion(
    boreDiameter, 
    blockTemp - ambientTemp, 
    MATERIALS.BLOCK_CAST_IRON
  );
  const pistonExpansion = calculateThermalExpansion(
    pistonDiameter, 
    pistonTemp - ambientTemp, 
    MATERIALS.PISTON_ALUMINUM
  );
  
  // Hot clearance = cold clearance + bore growth - piston growth
  return coldClearance + blockExpansion - pistonExpansion;
}
