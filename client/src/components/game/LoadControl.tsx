import { useState } from "react";
import { useEngine } from "@/lib/stores/useEngine";
import { usePhysicsEngine } from "@/lib/stores/usePhysicsEngine";
import { ChevronUp, ChevronDown, Zap } from "lucide-react";

export function LoadControl() {
  const { load, setLoad, temperature, stress, hasFailed, failureType, resetFailure } = useEngine();
  const physicsEngine = usePhysicsEngine();
  const usePhysicsMode = physicsEngine.usePhysicsMode;
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const effectiveLoad = usePhysicsMode ? physicsEngine.externalLoad : load;
  const handleSetLoad = usePhysicsMode ? physicsEngine.setLoad : setLoad;
  
  const physicsState = physicsEngine.physicsState;
  const physicsTemp = usePhysicsMode ? (physicsState.oilTemp - 273) / 150 : temperature;
  const peakPressure = usePhysicsMode ? Math.max(...physicsState.cylinders.map(c => c.pressure)) / 8000000 : stress;

  const displayTemp = usePhysicsMode ? physicsTemp : temperature;
  const displayStress = usePhysicsMode ? peakPressure : stress;

  const getTempColor = () => {
    if (displayTemp < 0.3) return "text-blue-400";
    if (displayTemp < 0.5) return "text-green-400";
    if (displayTemp < 0.7) return "text-yellow-400";
    if (displayTemp < 0.85) return "text-orange-400";
    return "text-red-500";
  };

  const getStressColor = () => {
    if (displayStress < 0.3) return "bg-green-500";
    if (displayStress < 0.6) return "bg-yellow-500";
    if (displayStress < 0.8) return "bg-orange-500";
    return "bg-red-500";
  };

  const getTempBarColor = () => {
    if (displayTemp < 0.3) return "bg-blue-500";
    if (displayTemp < 0.5) return "bg-green-500";
    if (displayTemp < 0.7) return "bg-yellow-500";
    if (displayTemp < 0.85) return "bg-orange-500";
    return "bg-red-500";
  };

  const getFailureMessage = () => {
    switch (failureType) {
      case 'connecting_rod': return 'CONNECTING ROD FAILURE';
      case 'piston': return 'PISTON FAILURE';
      case 'valve_drop': return 'DROPPED VALVE';
      case 'block_crack': return 'BLOCK CRACKED';
      case 'rod_bearing': return 'ROD BEARING FAILURE';
      case 'overheat': return 'ENGINE OVERHEATED';
      default: return 'ENGINE FAILURE';
    }
  };

  return (
    <div className="absolute right-2 sm:right-4 md:right-6 bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 flex flex-col bg-black/80 backdrop-blur-md rounded-xl border border-white/10 max-w-[140px] sm:min-w-[180px] overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-3 py-2 flex items-center justify-between text-white/90 hover:bg-white/5 sm:hidden"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span className="text-xs font-medium">Load</span>
        </div>
        {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      <div className={`${isCollapsed ? 'hidden' : 'flex'} sm:flex flex-col items-center gap-2 sm:gap-4 p-2 sm:p-4`}>
        <div className="text-white text-xs sm:text-sm font-semibold uppercase tracking-wider hidden sm:block">Load / Stress</div>
      
      {hasFailed ? (
        <div className="flex flex-col items-center gap-3">
          <div className="text-red-500 font-bold text-sm sm:text-lg animate-pulse text-center">
            {getFailureMessage()}
          </div>
          <button
            onClick={resetFailure}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all"
          >
            REBUILD ENGINE
          </button>
        </div>
      ) : (
        <>
          <div className="w-full space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Load</span>
                <span>{Math.round(effectiveLoad)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={effectiveLoad}
                onChange={(e) => handleSetLoad(Number(e.target.value))}
                className="w-full h-2 appearance-none bg-gray-700 rounded-lg cursor-pointer accent-orange-500"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{usePhysicsMode ? 'Oil Temp' : 'Temperature'}</span>
                <span className={getTempColor()}>{Math.round(displayTemp * 100)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-lg overflow-hidden">
                <div 
                  className={`h-full ${getTempBarColor()} transition-all duration-300`}
                  style={{ width: `${Math.min(displayTemp * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>COLD</span>
                <span>NORMAL</span>
                <span>HOT</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{usePhysicsMode ? 'Cyl Pressure' : 'Stress'}</span>
                <span>{Math.round(displayStress * 100)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-lg overflow-hidden">
                <div 
                  className={`h-full ${getStressColor()} transition-all duration-300`}
                  style={{ width: `${Math.min(displayStress * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-gray-500 text-center mt-2">
            {usePhysicsMode ? (
              <>Load applies brake torque<br/>Real thermodynamics active</>
            ) : (
              <>High RPM + Load = Stress<br/>Stress + Heat = Failure Risk</>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
