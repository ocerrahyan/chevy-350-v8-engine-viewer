// ============================================================================
// CHEVY 350 STARTER MOTOR SIMULATION
// Simulates the starter motor cranking the engine to firing RPM
// ============================================================================

export interface StarterMotorState {
  engaged: boolean;
  cranking: boolean;
  crankRPM: number;
  motorCurrent: number;        // Amps
  motorTorque: number;         // N·m
  batteryVoltage: number;      // Volts
  temperature: number;         // °C
  crankingTime: number;        // Seconds
  
  // Starter health
  solenoidEngaged: boolean;
  gearMeshed: boolean;
  overheated: boolean;
}

export interface StarterMotorSpecs {
  // Delco 10MT/12MT starter specs (typical Chevy 350)
  ratedVoltage: number;        // 12V nominal
  stallTorque: number;         // N·m at 0 RPM
  noLoadRPM: number;           // Free spinning RPM
  stallCurrent: number;        // Amps at stall
  noLoadCurrent: number;       // Amps free spinning
  gearRatio: number;           // Starter gear to flywheel
  maxCrankingTime: number;     // Seconds before overheat
  engageTime: number;          // Seconds for solenoid to engage
  disengageRPM: number;        // RPM to auto-disengage
}

// Delco 10MT starter specifications
export const STARTER_SPECS: StarterMotorSpecs = {
  ratedVoltage: 12,
  stallTorque: 15.0,           // ~11 ft-lbs at stall
  noLoadRPM: 6000,             // Free spin RPM
  stallCurrent: 450,           // High current at stall
  noLoadCurrent: 80,           // Minimal current free spinning
  gearRatio: 15.7,             // 15.7:1 typical (9 tooth to 141 tooth flywheel)
  maxCrankingTime: 30,         // 30 seconds max continuous
  engageTime: 0.15,            // 150ms solenoid engage time
  disengageRPM: 400,           // Disengage when engine fires
};

// Battery specifications (typical automotive 12V)
export interface BatteryState {
  voltage: number;             // Current voltage
  capacity: number;            // Ah capacity
  stateOfCharge: number;       // 0-1
  internalResistance: number;  // Ohms
  temperature: number;         // °C
}

export const BATTERY_SPECS: BatteryState = {
  voltage: 12.6,               // Fully charged
  capacity: 65,                // 65 Ah typical
  stateOfCharge: 1.0,
  internalResistance: 0.005,   // 5 milliohms
  temperature: 25,
};

export function createInitialStarterState(): StarterMotorState {
  return {
    engaged: false,
    cranking: false,
    crankRPM: 0,
    motorCurrent: 0,
    motorTorque: 0,
    batteryVoltage: BATTERY_SPECS.voltage,
    temperature: 25,
    crankingTime: 0,
    solenoidEngaged: false,
    gearMeshed: false,
    overheated: false,
  };
}

// Calculate compression resistance torque based on crank angle
export function calculateCompressionTorque(
  crankAngle: number,
  numCylinders: number = 8
): number {
  // Simplified model: compression peaks every 90° for V8
  // Real compression torque varies with cylinder pressure
  let totalTorque = 0;
  
  for (let i = 0; i < numCylinders; i++) {
    // Phase offset for each cylinder (cross-plane V8)
    const phaseOffsets = [0, 90, 180, 270, 180, 270, 0, 90];
    const cylinderAngle = (crankAngle * 180 / Math.PI + phaseOffsets[i]) % 720;
    
    // Compression stroke: 180-360° and 540-720°
    let compressionTorque = 0;
    if ((cylinderAngle >= 180 && cylinderAngle <= 360) || 
        (cylinderAngle >= 540 && cylinderAngle <= 720)) {
      // Sinusoidal compression resistance
      const phase = ((cylinderAngle - 180) % 360) / 360 * Math.PI;
      compressionTorque = Math.sin(phase) * 8; // Peak ~8 N·m per cylinder
    }
    totalTorque += compressionTorque;
  }
  
  return totalTorque;
}

// Calculate starter motor torque based on RPM and voltage
export function calculateStarterTorque(
  state: StarterMotorState,
  battery: BatteryState,
  specs: StarterMotorSpecs = STARTER_SPECS
): number {
  if (!state.engaged || !state.gearMeshed || state.overheated) {
    return 0;
  }
  
  // Voltage drop due to load
  const voltageAtStarter = battery.voltage - (state.motorCurrent * battery.internalResistance);
  const voltageRatio = voltageAtStarter / specs.ratedVoltage;
  
  // Linear torque-speed characteristic
  // Torque = stallTorque * (1 - RPM/noLoadRPM) * voltageRatio
  const rpmRatio = Math.min(state.crankRPM * specs.gearRatio / specs.noLoadRPM, 1);
  const torque = specs.stallTorque * (1 - rpmRatio) * voltageRatio;
  
  // Divide by gear ratio to get crankshaft torque
  return Math.max(0, torque / specs.gearRatio * specs.gearRatio); // Net starter output
}

// Calculate motor current draw
export function calculateStarterCurrent(
  crankRPM: number,
  battery: BatteryState,
  specs: StarterMotorSpecs = STARTER_SPECS
): number {
  // Current follows torque characteristic (inverse of RPM)
  const rpmRatio = Math.min(crankRPM * specs.gearRatio / specs.noLoadRPM, 1);
  const current = specs.stallCurrent * (1 - rpmRatio) + specs.noLoadCurrent * rpmRatio;
  
  // Reduce current if battery voltage drops
  const voltageRatio = battery.voltage / specs.ratedVoltage;
  return current * voltageRatio;
}

// Update starter motor state
export function updateStarterMotor(
  state: StarterMotorState,
  battery: BatteryState,
  crankRPM: number,
  keyTurnedToStart: boolean,
  engineRunning: boolean,
  dt: number,
  specs: StarterMotorSpecs = STARTER_SPECS
): StarterMotorState {
  const newState = { ...state };
  newState.crankRPM = crankRPM;
  
  // Handle key position
  if (keyTurnedToStart && !engineRunning && !state.overheated) {
    if (!state.solenoidEngaged) {
      // Begin solenoid engagement
      newState.solenoidEngaged = true;
      newState.engaged = false; // Not yet meshed
    } else if (!state.gearMeshed) {
      // Solenoid engaged, now mesh gears
      newState.gearMeshed = true;
      newState.engaged = true;
      newState.cranking = true;
    }
  } else {
    // Key released or engine running
    if (engineRunning && crankRPM > specs.disengageRPM) {
      // Auto-disengage when engine fires
      newState.engaged = false;
      newState.gearMeshed = false;
      newState.cranking = false;
    } else if (!keyTurnedToStart) {
      // Key released
      newState.engaged = false;
      newState.solenoidEngaged = false;
      newState.gearMeshed = false;
      newState.cranking = false;
    }
  }
  
  // Calculate current and torque
  if (newState.cranking) {
    newState.motorCurrent = calculateStarterCurrent(crankRPM, battery, specs);
    newState.motorTorque = calculateStarterTorque(newState, battery, specs);
    newState.crankingTime += dt;
    
    // Heat buildup
    const powerDissipation = newState.motorCurrent * newState.motorCurrent * 0.01; // I²R losses
    newState.temperature += (powerDissipation * dt) / 50; // Simplified thermal model
    
    // Check overheat
    if (newState.crankingTime > specs.maxCrankingTime || newState.temperature > 150) {
      newState.overheated = true;
      newState.cranking = false;
      newState.engaged = false;
    }
  } else {
    newState.motorCurrent = 0;
    newState.motorTorque = 0;
    
    // Cool down when not cranking
    if (newState.temperature > 25) {
      newState.temperature -= dt * 2; // Slow cooldown
    }
    if (newState.crankingTime > 0 && !keyTurnedToStart) {
      newState.crankingTime = Math.max(0, newState.crankingTime - dt * 0.5);
    }
    if (newState.overheated && newState.temperature < 80) {
      newState.overheated = false; // Reset overheat after cooldown
    }
  }
  
  // Update battery voltage under load
  newState.batteryVoltage = battery.voltage - (newState.motorCurrent * battery.internalResistance);
  
  return newState;
}

// Calculate if starter can overcome compression
export function canStarterCrankEngine(
  starterTorque: number,
  compressionTorque: number,
  frictionTorque: number = 5 // ~5 N·m base friction
): boolean {
  return starterTorque > (compressionTorque + frictionTorque);
}

// Calculate resultant angular acceleration during cranking
export function calculateCrankingAcceleration(
  starterTorque: number,
  compressionTorque: number,
  frictionTorque: number,
  crankInertia: number = 0.12 // kg·m²
): number {
  const netTorque = starterTorque - compressionTorque - frictionTorque;
  return netTorque / crankInertia; // α = τ/I
}
