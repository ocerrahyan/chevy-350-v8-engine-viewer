import { useState } from "react";
import { usePhysicsEngine } from "@/lib/stores/usePhysicsEngine";
import { ChevronUp, ChevronDown, Activity } from "lucide-react";

export function PhysicsTelemetry() {
  const physicsEngine = usePhysicsEngine();
  const { physicsState, usePhysicsMode, isRunning, isCranking, starterState, carburetorState } = physicsEngine;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  if (!usePhysicsMode) return null;
  
  const rpm = physicsState.rpm;
  const power = physicsState.powerHP;
  const torque = physicsState.brakeTorque;
  const manifoldPressure = physicsState.manifoldPressure / 1000;
  const sparkAdvance = physicsState.sparkAdvance;
  const throttle = physicsState.throttlePosition * 100;
  const oilTemp = physicsState.oilTemp - 273;
  const coolantTemp = physicsState.coolantTemp - 273;
  
  const cyl1 = physicsState.cylinders[0];
  const peakPressure = Math.max(...physicsState.cylinders.map(c => c.pressure)) / 100000;
  
  const getStatusColor = () => {
    if (isRunning) return 'text-green-400';
    if (isCranking) return 'text-yellow-400';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (isRunning) return 'RUNNING';
    if (isCranking) return 'CRANKING';
    return 'OFF';
  };
  
  return (
    <div className="absolute left-2 top-14 sm:top-16 bg-black/90 backdrop-blur-md rounded-xl border border-blue-500/30 text-xs font-mono max-w-[180px] sm:min-w-[200px] overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-3 py-2 flex items-center justify-between text-blue-400 hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3" />
          <span className="font-bold text-[10px] sm:text-xs">TELEMETRY</span>
        </div>
        {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
      
      <div className={`${isCollapsed ? 'hidden' : 'block'} p-2 sm:p-3 pt-0`}>
        <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-0.5 sm:gap-y-1 text-[10px] sm:text-xs">
          <div className="text-gray-400">RPM:</div>
          <div className="text-white text-right">{rpm.toFixed(0)}</div>
          
          <div className="text-gray-400">Power:</div>
          <div className="text-green-400 text-right">{power.toFixed(1)} HP</div>
          
          <div className="text-gray-400">Torque:</div>
          <div className="text-yellow-400 text-right">{torque.toFixed(1)} Nm</div>
          
          <div className="text-gray-400">MAP:</div>
          <div className="text-cyan-400 text-right">{manifoldPressure.toFixed(1)} kPa</div>
          
          <div className="text-gray-400">AFR:</div>
          <div className="text-purple-400 text-right">{carburetorState.airFuelRatio.toFixed(1)}:1</div>
          
          <div className="text-gray-400">Spark:</div>
          <div className="text-orange-400 text-right">{sparkAdvance.toFixed(1)}°</div>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-2 text-[9px] sm:text-[10px] text-gray-500 hover:text-gray-300"
        >
          {showDetails ? '▲ Hide Details' : '▼ Show Details'}
        </button>
        
        {showDetails && (
          <>
            <div className="mt-1 pt-1 border-t border-gray-700/50">
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] sm:text-[10px]">
                <div className="text-gray-500">Peak P:</div>
                <div className="text-red-400 text-right">{peakPressure.toFixed(1)} bar</div>
                
                <div className="text-gray-500">Oil:</div>
                <div className={`text-right ${oilTemp > 100 ? 'text-red-400' : 'text-white'}`}>{oilTemp.toFixed(0)}°C</div>
                
                <div className="text-gray-500">Coolant:</div>
                <div className={`text-right ${coolantTemp > 95 ? 'text-red-400' : 'text-white'}`}>{coolantTemp.toFixed(0)}°C</div>
                
                <div className="text-gray-500">Battery:</div>
                <div className="text-white text-right">{starterState.batteryVoltage.toFixed(1)}V</div>
              </div>
            </div>
            
            <div className="mt-1 pt-1 border-t border-gray-700/50">
              <div className="text-gray-600 text-center text-[8px]">CYL 1</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                <div className="text-gray-600">Intake:</div>
                <div className="text-cyan-400 text-right">{(cyl1.intakeValveLift * 1000).toFixed(1)}mm</div>
                
                <div className="text-gray-600">Exhaust:</div>
                <div className="text-orange-400 text-right">{(cyl1.exhaustValveLift * 1000).toFixed(1)}mm</div>
              </div>
            </div>
          </>
        )}
        
        <div className="mt-2 pt-1 border-t border-gray-700/50">
          <div className={`text-center text-[9px] sm:text-[10px] ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>
      </div>
    </div>
  );
}
