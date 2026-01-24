// ============================================================================
// CHEVY 350 CARBURETOR SIMULATION
// Rochester Quadrajet or Holley 4-barrel carburetor model
// ============================================================================

export interface CarburetorState {
  // Throttle state
  throttleAngle: number;           // 0-90 degrees
  throttlePosition: number;        // 0-1 normalized
  
  // Fuel metering
  primaryMeteringRods: number;     // 0-1 rod position (affects richness)
  secondaryOpening: number;        // 0-1 secondary throttle opening
  acceleratorPumpDischarge: number; // ml/s fuel from accel pump
  
  // Choke system
  chokePosition: number;           // 0-1 (1 = fully closed/cold, 0 = open/warm)
  chokeType: 'manual' | 'electric' | 'hot_air';
  
  // Idle system
  idleMixtureScrew: number;        // Turns out from seated (1.5-2.5 typical)
  idleSpeedScrew: number;          // Throttle stop adjustment (RPM)
  idleAirBleed: number;            // Air bleed adjustment
  
  // Fuel bowl
  fuelLevel: number;               // mm below rim (stock ~23mm)
  fuelPressure: number;            // PSI from fuel pump
  floatDrop: number;               // Float travel
  
  // Calculated outputs
  airFlowCFM: number;              // Cubic feet per minute
  fuelFlowRate: number;            // ml/s
  airFuelRatio: number;            // Mass ratio
  mixtureQuality: 'lean' | 'stoich' | 'rich' | 'very_rich';
  
  // Power enrichment
  powerValveOpen: boolean;         // Opens at low vacuum
  powerValvePoint: number;         // Inches Hg to open
}

export interface CarburetorSpecs {
  // Rochester Quadrajet Q-Jet specs (750 CFM)
  cfmRating: number;               // Max airflow CFM
  venturiDiameter: number;         // Primary venturi inches
  boosterDiameter: number;         // Signal booster inches
  
  // Jets and rods
  primaryJetSize: number;          // Drill size
  secondaryJetSize: number;
  meteringRodProfile: number[];    // Rich to lean profile
  
  // Accelerator pump
  pumpCamProfile: string;          // 'pink', 'white', 'black' cam
  pumpCapacity: number;            // ml per stroke
  pumpDuration: number;            // seconds for full discharge
  
  // Choke specs
  pulloffAngle: number;            // Initial choke opening degrees
  warmupTime: number;              // Seconds for full choke open (electric)
  
  // Power enrichment
  powerValveVacuum: number;        // Inches Hg threshold
  powerEnrichment: number;         // Percent fuel increase
}

// Rochester Quadrajet specifications (stock 350)
export const QJET_SPECS: CarburetorSpecs = {
  cfmRating: 750,
  venturiDiameter: 1.375,
  boosterDiameter: 0.375,
  primaryJetSize: 73,              // #73 jets
  secondaryJetSize: 82,
  meteringRodProfile: [0.038, 0.040, 0.042, 0.044], // Power tip sizes
  pumpCamProfile: 'pink',
  pumpCapacity: 8,                 // 8ml capacity
  pumpDuration: 2.0,               // 2 seconds full discharge
  pulloffAngle: 25,
  warmupTime: 180,                 // 3 minutes electric choke
  powerValveVacuum: 6.5,           // Opens below 6.5" Hg
  powerEnrichment: 8,              // 8% richer at WOT
};

// Holley 4150 specs (alternative)
export const HOLLEY_SPECS: CarburetorSpecs = {
  cfmRating: 600,
  venturiDiameter: 1.5,
  boosterDiameter: 0.35,
  primaryJetSize: 66,
  secondaryJetSize: 72,
  meteringRodProfile: [0.070, 0.073, 0.076],
  pumpCamProfile: 'pink',
  pumpCapacity: 10,
  pumpDuration: 1.5,
  pulloffAngle: 22,
  warmupTime: 120,
  powerValveVacuum: 6.5,
  powerEnrichment: 10,
};

export function createInitialCarburetorState(): CarburetorState {
  return {
    throttleAngle: 0,
    throttlePosition: 0,
    primaryMeteringRods: 0,
    secondaryOpening: 0,
    acceleratorPumpDischarge: 0,
    chokePosition: 0,              // Start with warm engine (no choke)
    chokeType: 'electric',
    idleMixtureScrew: 2.0,         // 2 turns out
    idleSpeedScrew: 700,           // 700 RPM idle
    idleAirBleed: 0.5,
    fuelLevel: 23,                 // Stock float level
    fuelPressure: 6.5,             // PSI (mechanical pump)
    floatDrop: 1.0,
    airFlowCFM: 0,
    fuelFlowRate: 0,
    airFuelRatio: 14.7,
    mixtureQuality: 'stoich',
    powerValveOpen: false,
    powerValvePoint: 6.5,
  };
}

// Calculate air flow through carburetor
export function calculateAirFlow(
  throttlePosition: number,
  manifoldVacuum: number,        // Inches Hg
  rpm: number,
  displacement: number = 350,     // Cubic inches
  volumetricEfficiency: number = 0.85,
  specs: CarburetorSpecs = QJET_SPECS
): number {
  // Theoretical air flow = (displacement × RPM × VE) / (2 × 1728)
  // Divided by 2 for 4-stroke (one intake per 2 revolutions)
  // 1728 = cubic inches per cubic foot
  const theoreticalCFM = (displacement * rpm * volumetricEfficiency) / (2 * 1728);
  
  // Throttle restriction
  const throttleFactor = Math.sin(throttlePosition * Math.PI / 2);
  
  // Carburetor flow limit
  const carbLimit = specs.cfmRating;
  
  // Actual flow is minimum of demand and carburetor capacity
  const actualCFM = Math.min(theoreticalCFM * throttleFactor, carbLimit);
  
  return actualCFM;
}

// Calculate fuel flow for target AFR
export function calculateFuelFlow(
  airFlowCFM: number,
  targetAFR: number = 14.7,
  airDensity: number = 1.225     // kg/m³ at sea level
): number {
  // Convert CFM to kg/s
  const airFlowM3s = airFlowCFM * 0.000471947;  // CFM to m³/s
  const airMassFlow = airFlowM3s * airDensity;   // kg/s air
  
  // Fuel flow = air flow / AFR
  const fuelMassFlow = airMassFlow / targetAFR;  // kg/s fuel
  
  // Convert to ml/s (gasoline density ~0.75 kg/L)
  const fuelVolumeFlow = (fuelMassFlow / 0.75) * 1000; // ml/s
  
  return fuelVolumeFlow;
}

// Calculate AFR from idle mixture setting
export function calculateIdleAFR(
  idleMixtureScrew: number,
  baseAFR: number = 14.7
): number {
  // Mixture screw affects fuel delivery
  // More turns out = richer mixture
  // 1.5 turns = lean, 2.0 = stoich, 2.5+ = rich
  const richnessFactor = (idleMixtureScrew - 2.0) * 0.5;
  return baseAFR / (1 + richnessFactor * 0.1);
}

// Calculate choke enrichment
export function calculateChokeEnrichment(
  chokePosition: number,
  baseAFR: number = 14.7
): number {
  // Choke richens mixture for cold start
  // Fully closed choke = AFR ~8:1 (very rich for starting)
  const chokeEnrichment = chokePosition * 0.45; // Up to 45% richer
  return baseAFR / (1 + chokeEnrichment);
}

// Calculate accelerator pump discharge
export function calculateAccelPumpDischarge(
  throttleRate: number,          // degrees/second change
  pumpRemaining: number,         // ml remaining in pump
  specs: CarburetorSpecs = QJET_SPECS
): number {
  if (throttleRate <= 0 || pumpRemaining <= 0) {
    return 0;
  }
  
  // Pump discharge proportional to throttle opening rate
  const maxDischarge = specs.pumpCapacity / specs.pumpDuration;
  const discharge = Math.min(throttleRate / 90 * maxDischarge, pumpRemaining / 0.016);
  
  return discharge; // ml/s
}

// Update carburetor state
export function updateCarburetor(
  state: CarburetorState,
  throttleInput: number,         // 0-1 throttle pedal
  manifoldVacuum: number,        // Inches Hg
  rpm: number,
  coolantTemp: number,           // °C
  dt: number,
  specs: CarburetorSpecs = QJET_SPECS
): CarburetorState {
  const newState = { ...state };
  
  // Update throttle
  const prevThrottle = state.throttlePosition;
  newState.throttlePosition = throttleInput;
  newState.throttleAngle = throttleInput * 90;
  
  // Calculate throttle rate for accel pump
  const throttleRate = (throttleInput - prevThrottle) / dt * 90;
  
  // Secondary opening (Quadrajet: vacuum-operated, opens above 50% throttle)
  if (throttleInput > 0.5 && rpm > 2500) {
    const secondaryOpening = (throttleInput - 0.5) * 2 * (1 - 15 / Math.max(manifoldVacuum, 15));
    newState.secondaryOpening = Math.min(1, Math.max(0, secondaryOpening));
  } else {
    newState.secondaryOpening = 0;
  }
  
  // Choke position (electric choke warms up with coolant)
  if (state.chokeType === 'electric') {
    if (coolantTemp < 40) {
      newState.chokePosition = 1.0; // Fully closed when cold
    } else if (coolantTemp < 80) {
      newState.chokePosition = (80 - coolantTemp) / 40; // Linear warmup
    } else {
      newState.chokePosition = 0; // Fully open when warm
    }
  }
  
  // Power valve
  newState.powerValveOpen = manifoldVacuum < specs.powerValveVacuum;
  
  // Primary metering rod position (vacuum-controlled)
  // High vacuum (cruise) = rods down = lean
  // Low vacuum (WOT) = rods up = rich
  const rodPosition = 1 - Math.min(manifoldVacuum / 18, 1);
  newState.primaryMeteringRods = rodPosition;
  
  // Calculate air flow
  newState.airFlowCFM = calculateAirFlow(
    throttleInput, 
    manifoldVacuum, 
    rpm, 
    350, 
    0.85, 
    specs
  );
  
  // Calculate base AFR
  let targetAFR: number;
  if (throttleInput < 0.1) {
    // Idle - use mixture screw setting
    targetAFR = calculateIdleAFR(state.idleMixtureScrew);
  } else if (throttleInput > 0.8 || newState.powerValveOpen) {
    // WOT or power enrichment - run rich for power
    targetAFR = 12.5;
  } else {
    // Part throttle cruise - lean for economy
    targetAFR = 14.7 + (1 - throttleInput) * 1.5; // Up to 16.2 lean cruise
  }
  
  // Apply choke enrichment
  if (newState.chokePosition > 0) {
    targetAFR = calculateChokeEnrichment(newState.chokePosition, targetAFR);
  }
  
  // Calculate fuel flow
  newState.fuelFlowRate = calculateFuelFlow(newState.airFlowCFM, targetAFR);
  
  // Add accelerator pump fuel
  if (throttleRate > 5) {
    newState.acceleratorPumpDischarge = calculateAccelPumpDischarge(
      throttleRate, 
      specs.pumpCapacity,
      specs
    );
    newState.fuelFlowRate += newState.acceleratorPumpDischarge;
  } else {
    newState.acceleratorPumpDischarge = 0;
  }
  
  // Recalculate actual AFR
  const airMassFlow = newState.airFlowCFM * 0.000471947 * 1.225;
  const fuelMassFlow = newState.fuelFlowRate / 1000 * 0.75;
  newState.airFuelRatio = fuelMassFlow > 0 ? airMassFlow / fuelMassFlow : 14.7;
  
  // Classify mixture quality
  if (newState.airFuelRatio > 16) {
    newState.mixtureQuality = 'lean';
  } else if (newState.airFuelRatio > 13.5) {
    newState.mixtureQuality = 'stoich';
  } else if (newState.airFuelRatio > 11) {
    newState.mixtureQuality = 'rich';
  } else {
    newState.mixtureQuality = 'very_rich';
  }
  
  return newState;
}

// Check if mixture can sustain combustion
export function canSupportCombustion(
  airFuelRatio: number,
  rpm: number
): boolean {
  // Combustion limits for gasoline
  const leanLimit = 18.0;   // Too lean, won't burn
  const richLimit = 8.0;    // Too rich, won't burn
  
  // Need minimum RPM for stable combustion
  const minRPM = 200;
  
  return airFuelRatio >= richLimit && 
         airFuelRatio <= leanLimit && 
         rpm >= minRPM;
}

// Calculate idle RPM from idle speed screw
export function calculateTargetIdleRPM(
  idleSpeedScrew: number,
  airConditioningOn: boolean = false,
  transmissionInDrive: boolean = false
): number {
  let baseIdle = idleSpeedScrew;
  
  // Additional loads increase target idle
  if (airConditioningOn) baseIdle += 100;
  if (transmissionInDrive) baseIdle -= 50;
  
  return Math.max(500, Math.min(1200, baseIdle));
}

// Check if engine can idle
export function canEngineIdle(
  rpm: number,
  afr: number,
  manifoldVacuum: number
): { canIdle: boolean; reason?: string } {
  if (rpm < 400) {
    return { canIdle: false, reason: 'RPM too low' };
  }
  if (afr < 10 || afr > 17) {
    return { canIdle: false, reason: 'AFR out of range' };
  }
  if (manifoldVacuum < 8) {
    return { canIdle: false, reason: 'Vacuum leak or timing issue' };
  }
  return { canIdle: true };
}
