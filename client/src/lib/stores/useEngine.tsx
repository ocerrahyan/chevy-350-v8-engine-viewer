import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface EngineState {
  throttle: number;
  currentRPM: number;
  targetRPM: number;
  maxRPM: number;
  idleRPM: number;
  isRunning: boolean;
  
  // Load and stress simulation
  load: number; // 0-100% load on engine
  temperature: number; // Engine temperature (0-1 normalized, 0.5 = normal operating temp)
  stress: number; // Overall stress level (0-1)
  hasFailed: boolean; // Has catastrophic failure occurred
  failureType: string | null; // Type of failure if any

  // X-ray view mode
  xrayMode: boolean; // Toggle translucent view to see internal parts
  
  // CAD wireframe mode for performance
  cadMode: boolean; // Toggle wireframe rendering for better performance
  
  // Block visibility toggle (hide block to see rotating assembly)
  blockVisible: boolean;

  wireframeMode: boolean;
  materialPreset: 'default' | 'metallic' | 'matte' | 'colored';

  setThrottle: (throttle: number) => void;
  updateRPM: (delta: number) => void;
  toggleEngine: () => void;
  startEngine: () => void;
  stopEngine: () => void;
  
  // Load and stress controls
  setLoad: (load: number) => void;
  updateTemperature: (delta: number) => void;
  updateStress: (delta: number) => void;
  triggerFailure: (type: string) => void;
  resetFailure: () => void;
  
  // X-ray view control
  toggleXrayMode: () => void;
  
  // CAD mode control
  toggleCadMode: () => void;
  
  // Block visibility control
  toggleBlockVisible: () => void;

  toggleWireframe: () => void;
  setMaterialPreset: (preset: 'default' | 'metallic' | 'matte' | 'colored') => void;
}

export const useEngine = create<EngineState>()(
  subscribeWithSelector((set, get) => ({
    throttle: 0,
    currentRPM: 0,
    targetRPM: 0,
    maxRPM: 8000,
    idleRPM: 800,
    isRunning: false,
    
    // Load and stress simulation defaults
    load: 0,
    temperature: 0.3, // Cold start
    stress: 0,
    hasFailed: false,
    failureType: null,
    
    // X-ray view mode default
    xrayMode: false,
    
    // CAD wireframe mode default
    cadMode: false,
    
    // Block visibility default (visible)
    blockVisible: true,

    wireframeMode: false,
    materialPreset: 'default' as const,

    setThrottle: (throttle: number) => {
      const clampedThrottle = Math.max(0, Math.min(100, throttle));
      const { maxRPM, idleRPM, isRunning } = get();
      
      if (!isRunning) {
        set({ throttle: clampedThrottle, targetRPM: 0 });
        return;
      }
      
      const targetRPM = idleRPM + (clampedThrottle / 100) * (maxRPM - idleRPM);
      set({ throttle: clampedThrottle, targetRPM });
    },

    updateRPM: (delta: number) => {
      const { currentRPM, targetRPM, isRunning, hasFailed } = get();
      
      // If engine has failed, it stops
      if (hasFailed) {
        set({ currentRPM: Math.max(0, currentRPM - 5000 * delta) });
        return;
      }
      
      if (!isRunning && currentRPM <= 0) {
        set({ currentRPM: 0 });
        return;
      }
      
      const accelerationRate = 3000;
      const decelerationRate = 2000;
      
      let newRPM = currentRPM;
      
      if (currentRPM < targetRPM) {
        newRPM = Math.min(targetRPM, currentRPM + accelerationRate * delta);
      } else if (currentRPM > targetRPM) {
        newRPM = Math.max(targetRPM, currentRPM - decelerationRate * delta);
      }
      
      if (!isRunning) {
        newRPM = Math.max(0, currentRPM - decelerationRate * delta);
      }
      
      set({ currentRPM: newRPM });
      
      // Update temperature and stress based on RPM and load
      get().updateTemperature(delta);
      get().updateStress(delta);
    },

    toggleEngine: () => {
      const { isRunning } = get();
      if (isRunning) {
        get().stopEngine();
      } else {
        get().startEngine();
      }
    },

    startEngine: () => {
      const { idleRPM, throttle, maxRPM, hasFailed } = get();
      if (hasFailed) return; // Can't start a failed engine
      const targetRPM = idleRPM + (throttle / 100) * (maxRPM - idleRPM);
      set({ isRunning: true, targetRPM });
    },

    stopEngine: () => {
      set({ isRunning: false, targetRPM: 0 });
    },
    
    setLoad: (load: number) => {
      const clampedLoad = Math.max(0, Math.min(100, load));
      set({ load: clampedLoad });
    },
    
    updateTemperature: (delta: number) => {
      const { currentRPM, load, temperature, isRunning, maxRPM } = get();
      
      if (!isRunning) {
        // Engine cools down when off
        const newTemp = Math.max(0, temperature - delta * 0.02);
        set({ temperature: newTemp });
        return;
      }
      
      // Temperature rises based on RPM and load
      const rpmFactor = currentRPM / maxRPM;
      const loadFactor = load / 100;
      const heatGeneration = (rpmFactor * 0.5 + loadFactor * 0.5) * delta * 0.1;
      
      // Natural cooling (more at lower temps)
      const coolingRate = (temperature - 0.3) * delta * 0.05;
      
      const newTemp = Math.max(0, Math.min(1, temperature + heatGeneration - coolingRate));
      set({ temperature: newTemp });
      
      // Overheat failure
      if (newTemp >= 0.95 && Math.random() < 0.01) {
        get().triggerFailure('overheat');
      }
    },
    
    updateStress: (delta: number) => {
      const { currentRPM, load, stress, maxRPM, hasFailed } = get();
      
      if (hasFailed) return;
      
      // Stress accumulates based on RPM and load
      const rpmFactor = currentRPM / maxRPM;
      const loadFactor = load / 100;
      
      // High RPM + high load = rapid stress accumulation
      const stressGain = rpmFactor * loadFactor * delta * 0.05;
      
      // Stress recovery when not under heavy load
      const stressRecovery = (1 - loadFactor) * (1 - rpmFactor) * delta * 0.01;
      
      const newStress = Math.max(0, Math.min(1, stress + stressGain - stressRecovery));
      set({ stress: newStress });
      
      // Over-rev failure check (above redline)
      if (currentRPM > maxRPM * 0.95 && Math.random() < 0.005 * rpmFactor) {
        get().triggerFailure('rod_bearing');
      }
      
      // Catastrophic stress failure
      if (newStress >= 0.95 && Math.random() < 0.02) {
        const failureTypes = ['connecting_rod', 'piston', 'valve_drop', 'block_crack'];
        get().triggerFailure(failureTypes[Math.floor(Math.random() * failureTypes.length)]);
      }
    },
    
    triggerFailure: (type: string) => {
      set({ hasFailed: true, failureType: type, isRunning: false, targetRPM: 0 });
    },
    
    resetFailure: () => {
      set({ 
        hasFailed: false, 
        failureType: null, 
        stress: 0, 
        temperature: 0.3,
        currentRPM: 0,
        isRunning: false
      });
    },
    
    toggleXrayMode: () => {
      set(state => ({ xrayMode: !state.xrayMode }));
    },
    
    toggleCadMode: () => {
      set(state => ({ cadMode: !state.cadMode }));
    },
    
    toggleBlockVisible: () => {
      set(state => ({ blockVisible: !state.blockVisible }));
    },

    toggleWireframe: () => {
      set(state => ({ wireframeMode: !state.wireframeMode }));
    },

    setMaterialPreset: (preset: 'default' | 'metallic' | 'matte' | 'colored') => {
      set({ materialPreset: preset });
    },
  }))
);
