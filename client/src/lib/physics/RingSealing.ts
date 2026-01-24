// ============================================================================
// PISTON RING SEALING PHYSICS
// Models ring gap blow-by and compression loss
// ============================================================================

import { CLEARANCES } from './MaterialProperties';

const INCH_TO_METER = 0.0254;

export interface RingState {
  ringNumber: number;            // 1 = top, 2 = second, 3 = oil
  gapSize: number;               // Current gap in meters
  radialTension: number;         // N - ring tension against wall
  wearRate: number;              // mm/hour of operation
  sealingEfficiency: number;     // 0-1 (1 = perfect seal)
  temperature: number;           // °C
  oilFilmThickness: number;      // μm
}

export interface PistonClearanceState {
  pistonToWall: number;          // meters
  ringLandToRing: number;        // meters (side clearance)
  skirtToWall: number;           // meters
  thermalExpansion: number;      // meters change from cold
}

export interface BlowByState {
  topRingBlowBy: number;         // kg/s mass flow past top ring
  secondRingBlowBy: number;      // kg/s mass flow past second ring
  totalBlowBy: number;           // kg/s total to crankcase
  blowByVolume: number;          // L/min crankcase volume flow
  ringlandPressure: number;      // Pa pressure between rings
  compressionLoss: number;       // Percentage of compression lost
}

// Ring specifications for Chevy 350
export const RING_SPECS = {
  topRing: {
    width: 0.0625 * INCH_TO_METER,       // 1/16" compression ring
    thickness: 0.156 * INCH_TO_METER,     // Radial thickness
    gapCold: CLEARANCES.topRingGap.recommended * INCH_TO_METER,
    tension: 22,                           // N radial tension
    type: 'barrel_faced',
    coating: 'chrome',
  },
  secondRing: {
    width: 0.0625 * INCH_TO_METER,
    thickness: 0.156 * INCH_TO_METER,
    gapCold: CLEARANCES.secondRingGap.recommended * INCH_TO_METER,
    tension: 18,
    type: 'taper_faced',
    coating: 'cast_iron',
  },
  oilRing: {
    width: 0.1875 * INCH_TO_METER,        // 3/16" oil ring
    thickness: 0.138 * INCH_TO_METER,
    gapCold: CLEARANCES.oilRingGap.recommended * INCH_TO_METER,
    tension: 35,                           // Higher tension for oil control
    type: 'three_piece',
    coating: 'nitrided',
  },
};

// Calculate ring gap at operating temperature
export function calculateHotRingGap(
  coldGap: number,
  boreDiameter: number,
  coldTemp: number = 20,        // °C
  hotTemp: number = 180         // °C typical ring temp
): number {
  // Ring gap increases with temperature due to thermal expansion
  // Gap increase ≈ π × bore × ΔT × (expansion_coeff_ring - expansion_coeff_bore)
  const ringExpansion = 12.5e-6;  // Ductile iron ~12.5 μm/m/°C
  const boreExpansion = 10.8e-6;  // Cast iron bore ~10.8 μm/m/°C
  const deltaT = hotTemp - coldTemp;
  
  const gapIncrease = Math.PI * boreDiameter * deltaT * (ringExpansion - boreExpansion);
  return coldGap + gapIncrease;
}

// Calculate blow-by flow through ring gap
export function calculateRingBlowBy(
  upstreamPressure: number,      // Pa
  downstreamPressure: number,    // Pa
  gapArea: number,               // m² effective flow area
  temperature: number,           // K gas temperature
  gamma: number = 1.35           // Specific heat ratio
): number {
  if (upstreamPressure <= downstreamPressure) {
    return 0;
  }
  
  const R = 287; // Gas constant for air J/(kg·K)
  const pressureRatio = downstreamPressure / upstreamPressure;
  const criticalRatio = Math.pow(2 / (gamma + 1), gamma / (gamma - 1));
  
  let massFlow: number;
  
  if (pressureRatio < criticalRatio) {
    // Choked flow
    const mach1Flow = Math.sqrt(gamma / R / temperature) * 
                      Math.pow(2 / (gamma + 1), (gamma + 1) / (2 * (gamma - 1)));
    massFlow = gapArea * upstreamPressure * mach1Flow;
  } else {
    // Subsonic flow
    const term1 = Math.pow(pressureRatio, 2 / gamma);
    const term2 = Math.pow(pressureRatio, (gamma + 1) / gamma);
    const flowFunction = Math.sqrt(2 * gamma / (gamma - 1) * (term1 - term2));
    massFlow = gapArea * upstreamPressure * flowFunction / Math.sqrt(R * temperature);
  }
  
  return massFlow * 0.6; // Discharge coefficient ~0.6 for ring gap
}

// Calculate effective gap area considering ring flutter and dynamics
export function calculateEffectiveGapArea(
  nominalGap: number,
  ringWidth: number,
  rpm: number,
  cylinderPressure: number,
  ringTension: number
): number {
  // Base gap area
  let gapArea = nominalGap * ringWidth;
  
  // Ring flutter at high RPM reduces sealing
  const flutterFactor = 1 + Math.pow(rpm / 6000, 2) * 0.1;
  
  // High pressure improves seal (pushes ring against wall)
  const pressureFactor = 1 - Math.min(cylinderPressure / 5e6, 0.3) * 0.5;
  
  // Ring tension affects seal
  const tensionFactor = 22 / ringTension; // Normalized to 22N baseline
  
  return gapArea * flutterFactor * pressureFactor * tensionFactor;
}

// Calculate compression loss from blow-by
export function calculateCompressionLoss(
  blowByMassFlow: number,       // kg/s lost
  cylinderMass: number,         // kg total cylinder charge
  compressionTime: number       // seconds for compression stroke
): number {
  // Fraction of charge lost during compression
  const massLost = blowByMassFlow * compressionTime;
  const lossPercent = (massLost / cylinderMass) * 100;
  return Math.min(lossPercent, 50); // Cap at 50% (badly worn rings)
}

// Create initial ring state
export function createInitialRingState(): RingState[] {
  return [
    {
      ringNumber: 1,
      gapSize: RING_SPECS.topRing.gapCold,
      radialTension: RING_SPECS.topRing.tension,
      wearRate: 0.001,           // Very low for new rings
      sealingEfficiency: 0.98,
      temperature: 20,
      oilFilmThickness: 2.5,     // μm
    },
    {
      ringNumber: 2,
      gapSize: RING_SPECS.secondRing.gapCold,
      radialTension: RING_SPECS.secondRing.tension,
      wearRate: 0.001,
      sealingEfficiency: 0.95,
      temperature: 20,
      oilFilmThickness: 3.0,
    },
    {
      ringNumber: 3,
      gapSize: RING_SPECS.oilRing.gapCold,
      radialTension: RING_SPECS.oilRing.tension,
      wearRate: 0.002,
      sealingEfficiency: 0.90,   // Oil ring is for oil control, not compression
      temperature: 20,
      oilFilmThickness: 5.0,
    },
  ];
}

// Create initial blow-by state
export function createInitialBlowByState(): BlowByState {
  return {
    topRingBlowBy: 0,
    secondRingBlowBy: 0,
    totalBlowBy: 0,
    blowByVolume: 0,
    ringlandPressure: 101325,    // Atmospheric
    compressionLoss: 0,
  };
}

// Update ring sealing simulation
export function updateRingSealing(
  rings: RingState[],
  cylinderPressure: number,      // Pa
  crankcasePressure: number,     // Pa (slightly above atmospheric)
  gasTemperature: number,        // K
  rpm: number,
  boreDiameter: number,          // m
  cylinderMass: number           // kg
): BlowByState {
  const state: BlowByState = {
    topRingBlowBy: 0,
    secondRingBlowBy: 0,
    totalBlowBy: 0,
    blowByVolume: 0,
    ringlandPressure: 0,
    compressionLoss: 0,
  };
  
  // Calculate hot ring gaps
  const hotGap1 = calculateHotRingGap(rings[0].gapSize, boreDiameter, 20, rings[0].temperature);
  const hotGap2 = calculateHotRingGap(rings[1].gapSize, boreDiameter, 20, rings[1].temperature);
  
  // Effective gap areas
  const area1 = calculateEffectiveGapArea(
    hotGap1, 
    RING_SPECS.topRing.width, 
    rpm, 
    cylinderPressure, 
    rings[0].radialTension
  );
  const area2 = calculateEffectiveGapArea(
    hotGap2, 
    RING_SPECS.secondRing.width, 
    rpm, 
    cylinderPressure / 2,  // Reduced pressure at second ring
    rings[1].radialTension
  );
  
  // Ringland pressure (between top and second ring)
  // Approximation: average of cylinder and crankcase
  state.ringlandPressure = (cylinderPressure * 0.3 + crankcasePressure * 0.7);
  
  // Blow-by past top ring
  state.topRingBlowBy = calculateRingBlowBy(
    cylinderPressure,
    state.ringlandPressure,
    area1 * (1 - rings[0].sealingEfficiency * 0.5),
    gasTemperature
  );
  
  // Blow-by past second ring
  state.secondRingBlowBy = calculateRingBlowBy(
    state.ringlandPressure,
    crankcasePressure,
    area2 * (1 - rings[1].sealingEfficiency * 0.5),
    gasTemperature * 0.8  // Cooler at second ring
  );
  
  // Total blow-by to crankcase
  state.totalBlowBy = state.secondRingBlowBy;  // Only what passes both rings
  
  // Convert to volume flow (L/min at crankcase conditions)
  const crankcaseTemp = 353; // ~80°C oil temp
  const volumeFlow = state.totalBlowBy * 287 * crankcaseTemp / crankcasePressure;
  state.blowByVolume = volumeFlow * 60 * 1000; // L/min
  
  // Compression loss
  const compressionTime = 30 / rpm; // Approximate compression stroke time
  state.compressionLoss = calculateCompressionLoss(
    state.topRingBlowBy,
    cylinderMass,
    compressionTime
  );
  
  return state;
}

// Check if rings are worn beyond limits
export function areRingsWorn(rings: RingState[]): boolean {
  const maxGap = 0.035 * INCH_TO_METER; // 0.035" max gap before rebuild
  return rings.some(ring => ring.gapSize > maxGap);
}

// Calculate ring temperature from cylinder conditions
export function updateRingTemperatures(
  rings: RingState[],
  cylinderPeakTemp: number,      // K
  coolantTemp: number,           // K
  rpm: number
): RingState[] {
  return rings.map((ring, i) => {
    // Temperature gradient: top ring hottest, oil ring coolest
    const tempFactor = [0.85, 0.65, 0.45][i];
    const avgTemp = coolantTemp + (cylinderPeakTemp - coolantTemp) * tempFactor;
    
    // Convective cooling increases with RPM
    const coolingFactor = 1 + rpm / 6000 * 0.1;
    
    return {
      ...ring,
      temperature: (avgTemp - 273) / coolingFactor, // Convert to °C
    };
  });
}
