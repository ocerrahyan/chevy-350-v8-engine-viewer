import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { 
  EngineState as PhysicsEngineState,
  CylinderState,
  createInitialEngineState,
  simulateEngineStep,
  ENGINE_SPECS,
  VALVE_SPECS,
  FUEL_SPECS,
  THERMO_CONSTANTS,
  IGNITION_SPECS,
} from "../physics/EnginePhysics";
import {
  StarterMotorState,
  createInitialStarterState,
  updateStarterMotor,
  calculateStarterTorque,
  calculateCompressionTorque,
  STARTER_SPECS,
  BATTERY_SPECS,
  BatteryState,
} from "../physics/StarterMotor";
import {
  CarburetorState,
  createInitialCarburetorState,
  updateCarburetor,
  canSupportCombustion,
  QJET_SPECS,
} from "../physics/Carburetor";

interface PhysicsEngineStore {
  physicsState: PhysicsEngineState;
  starterState: StarterMotorState;
  carburetorState: CarburetorState;
  batteryState: BatteryState;
  
  isRunning: boolean;
  isCranking: boolean;
  usePhysicsMode: boolean;
  keyPosition: 'off' | 'run' | 'start';
  
  throttlePosition: number;
  externalLoad: number;
  chokePosition: number;
  
  setThrottle: (throttle: number) => void;
  setLoad: (load: number) => void;
  setChoke: (choke: number) => void;
  
  turnKeyToStart: () => void;
  turnKeyToRun: () => void;
  turnKeyOff: () => void;
  
  toggleEngine: () => void;
  startEngine: () => void;
  stopEngine: () => void;
  
  step: (dt: number) => void;
  reset: () => void;
  
  togglePhysicsMode: () => void;
  
  getCylinderData: (cylinderIndex: number) => CylinderState | null;
  getCrankAngle: () => number;
  getRPM: () => number;
  getPower: () => number;
  getTorque: () => number;
  getManifoldPressure: () => number;
  getSparkAdvance: () => number;
  getStarterState: () => StarterMotorState;
  getCarburetorState: () => CarburetorState;
}

export const usePhysicsEngine = create<PhysicsEngineStore>()(
  subscribeWithSelector((set, get) => ({
    physicsState: createInitialEngineState(),
    starterState: createInitialStarterState(),
    carburetorState: createInitialCarburetorState(),
    batteryState: { ...BATTERY_SPECS },
    
    isRunning: false,
    isCranking: false,
    usePhysicsMode: true,
    keyPosition: 'off' as const,
    
    throttlePosition: 0,
    externalLoad: 0,
    chokePosition: 0,
    
    setThrottle: (throttle: number) => {
      const clampedThrottle = Math.max(0, Math.min(100, throttle));
      set((state) => ({
        throttlePosition: clampedThrottle,
        physicsState: {
          ...state.physicsState,
          throttlePosition: clampedThrottle / 100,
        },
      }));
    },
    
    setLoad: (load: number) => {
      const clampedLoad = Math.max(0, Math.min(100, load));
      set({ externalLoad: clampedLoad });
    },
    
    setChoke: (choke: number) => {
      const clampedChoke = Math.max(0, Math.min(100, choke));
      set((state) => ({
        chokePosition: clampedChoke,
        carburetorState: {
          ...state.carburetorState,
          chokePosition: clampedChoke / 100,
        },
      }));
    },
    
    turnKeyToStart: () => {
      set({ keyPosition: 'start', isCranking: true });
    },
    
    turnKeyToRun: () => {
      set({ keyPosition: 'run', isCranking: false });
    },
    
    turnKeyOff: () => {
      set({ keyPosition: 'off', isCranking: false, isRunning: false });
    },
    
    toggleEngine: () => {
      const { isRunning, keyPosition } = get();
      if (isRunning) {
        get().turnKeyOff();
      } else if (keyPosition === 'off') {
        get().turnKeyToStart();
      }
    },
    
    startEngine: () => {
      set((state) => ({
        isRunning: true,
        keyPosition: 'run',
        isCranking: false,
        physicsState: {
          ...state.physicsState,
          crankAngularVelocity: (600 * 2 * Math.PI) / 60,
        },
      }));
    },
    
    stopEngine: () => {
      set({ isRunning: false, keyPosition: 'off', isCranking: false });
    },
    
    step: (dt: number) => {
      const { 
        isRunning, 
        isCranking, 
        keyPosition,
        physicsState, 
        starterState,
        carburetorState,
        batteryState,
        externalLoad,
        throttlePosition,
      } = get();
      
      // Update carburetor
      const manifoldVacuumInHg = (THERMO_CONSTANTS.ambientPressure - physicsState.manifoldPressure) / 3386.39;
      const newCarbState = updateCarburetor(
        carburetorState,
        throttlePosition / 100,
        manifoldVacuumInHg,
        physicsState.rpm,
        physicsState.coolantTemp - 273,
        dt,
        QJET_SPECS
      );
      
      // Check if engine can fire
      const canFire = canSupportCombustion(newCarbState.airFuelRatio, physicsState.rpm);
      
      // Update starter motor
      const newStarterState = updateStarterMotor(
        starterState,
        batteryState,
        physicsState.rpm,
        keyPosition === 'start',
        isRunning && physicsState.rpm > 400,
        dt,
        STARTER_SPECS
      );
      
      // Handle cranking vs running
      if (keyPosition === 'start' && !isRunning) {
        // Cranking mode - starter drives the engine
        const starterTorque = calculateStarterTorque(newStarterState, batteryState, STARTER_SPECS);
        const compressionTorque = calculateCompressionTorque(physicsState.crankAngle, 8);
        const frictionTorque = 5;
        
        // Update crank velocity from starter
        const netTorque = starterTorque - compressionTorque - frictionTorque;
        const crankInertia = ENGINE_SPECS.crankMomentOfInertia;
        const angularAccel = netTorque / crankInertia;
        
        const newState = { ...physicsState };
        newState.crankAngularVelocity = Math.max(0, physicsState.crankAngularVelocity + angularAccel * dt);
        newState.rpm = (newState.crankAngularVelocity * 60) / (2 * Math.PI);
        newState.crankAngle = (physicsState.crankAngle + newState.crankAngularVelocity * dt) % (4 * Math.PI);
        
        // Check if engine fires (RPM > 200, proper AFR)
        if (newState.rpm > 200 && canFire) {
          set({ 
            isRunning: true, 
            keyPosition: 'run',
            isCranking: false,
            physicsState: newState,
            starterState: newStarterState,
            carburetorState: newCarbState,
          });
          return;
        }
        
        set({ 
          physicsState: newState, 
          starterState: newStarterState,
          carburetorState: newCarbState,
        });
        return;
      }
      
      if (!isRunning) {
        // Engine off - just spin down
        if (physicsState.crankAngularVelocity > 0) {
          const windDownState = { ...physicsState };
          windDownState.crankAngularVelocity = Math.max(0, windDownState.crankAngularVelocity - 50 * dt);
          windDownState.rpm = (windDownState.crankAngularVelocity * 60) / (2 * Math.PI);
          windDownState.crankAngle = (windDownState.crankAngle + windDownState.crankAngularVelocity * dt) % (4 * Math.PI);
          set({ physicsState: windDownState, starterState: newStarterState, carburetorState: newCarbState });
        }
        return;
      }
      
      // Engine running - full physics simulation
      const substeps = 4;
      const subDt = dt / substeps;
      let state = physicsState;
      
      const loadTorqueNm = (externalLoad / 100) * 400;
      
      for (let i = 0; i < substeps; i++) {
        state = simulateEngineStep(state, subDt, loadTorqueNm);
      }
      
      // Check if engine stalls
      if (state.rpm < 200 || !canFire) {
        set({ isRunning: false, keyPosition: 'run' });
      }
      
      set({ physicsState: state, starterState: newStarterState, carburetorState: newCarbState });
    },
    
    reset: () => {
      set({
        physicsState: createInitialEngineState(),
        starterState: createInitialStarterState(),
        carburetorState: createInitialCarburetorState(),
        batteryState: { ...BATTERY_SPECS },
        isRunning: false,
        isCranking: false,
        keyPosition: 'off',
        throttlePosition: 0,
        externalLoad: 0,
        chokePosition: 0,
      });
    },
    
    togglePhysicsMode: () => {
      set((state) => ({ usePhysicsMode: !state.usePhysicsMode }));
    },
    
    getCylinderData: (cylinderIndex: number) => {
      const { physicsState } = get();
      if (cylinderIndex >= 0 && cylinderIndex < physicsState.cylinders.length) {
        return physicsState.cylinders[cylinderIndex];
      }
      return null;
    },
    
    getCrankAngle: () => get().physicsState.crankAngle,
    getRPM: () => get().physicsState.rpm,
    getPower: () => get().physicsState.powerHP,
    getTorque: () => get().physicsState.brakeTorque,
    getManifoldPressure: () => get().physicsState.manifoldPressure,
    getSparkAdvance: () => get().physicsState.sparkAdvance,
    getStarterState: () => get().starterState,
    getCarburetorState: () => get().carburetorState,
  }))
);

export { ENGINE_SPECS, VALVE_SPECS, FUEL_SPECS, THERMO_CONSTANTS, IGNITION_SPECS };
export type { CylinderState, PhysicsEngineState };
