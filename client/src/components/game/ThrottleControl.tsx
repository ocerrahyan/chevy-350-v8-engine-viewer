import { useEffect, useCallback, useState } from "react";
import { useEngine } from "@/lib/stores/useEngine";
import { usePhysicsEngine } from "@/lib/stores/usePhysicsEngine";
import { ChevronUp, ChevronDown, Gauge } from "lucide-react";

export function ThrottleControl() {
  const { throttle, setThrottle, isRunning, toggleEngine } = useEngine();
  const physicsEngine = usePhysicsEngine();
  const usePhysics = physicsEngine.usePhysicsMode;
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const effectiveThrottle = usePhysics ? physicsEngine.throttlePosition : throttle;
  const effectiveIsRunning = usePhysics ? physicsEngine.isRunning : isRunning;
  const isCranking = usePhysics && physicsEngine.isCranking;
  const keyPosition = usePhysics ? physicsEngine.keyPosition : 'off';
  
  const handleSetThrottle = useCallback((value: number) => {
    if (usePhysics) {
      physicsEngine.setThrottle(value);
    } else {
      setThrottle(value);
    }
  }, [usePhysics, physicsEngine, setThrottle]);
  
  const handleToggleEngine = useCallback(() => {
    if (usePhysics) {
      if (physicsEngine.isRunning) {
        physicsEngine.turnKeyOff();
      } else {
        physicsEngine.turnKeyToStart();
      }
    } else {
      toggleEngine();
    }
  }, [usePhysics, physicsEngine, toggleEngine]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const step = 5;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleSetThrottle(effectiveThrottle + step);
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSetThrottle(effectiveThrottle - step);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleToggleEngine();
      }
    },
    [effectiveThrottle, handleSetThrottle, handleToggleEngine]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getButtonState = () => {
    if (effectiveIsRunning) return { text: "STOP", color: "bg-red-600 hover:bg-red-700" };
    if (isCranking) return { text: "CRANKING...", color: "bg-yellow-600 animate-pulse" };
    return { text: "CRANK", color: "bg-green-600 hover:bg-green-700" };
  };

  const buttonState = getButtonState();

  return (
    <div className="absolute left-2 sm:left-4 md:left-6 bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 flex flex-col items-center bg-black/80 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden max-w-[140px] sm:max-w-none">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-3 py-2 flex items-center justify-between text-white/90 hover:bg-white/5 sm:hidden"
      >
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          <span className="text-xs font-medium">Throttle</span>
        </div>
        {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <div className={`${isCollapsed ? 'hidden' : 'flex'} sm:flex flex-row sm:flex-col items-center gap-2 sm:gap-4 p-2 sm:p-4`}>
        <div className="text-white text-xs sm:text-sm font-semibold uppercase tracking-wider hidden sm:block">Throttle</div>
        
        <div className="relative h-20 sm:h-48 md:h-64 w-6 sm:w-12 bg-gray-800 rounded-lg overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
            style={{ height: `${effectiveThrottle}%` }}
          />
          <div className="absolute inset-0 flex flex-col justify-between py-1 sm:py-2">
            {[100, 50, 0].map((val) => (
              <div key={val} className="flex items-center justify-end pr-0.5 sm:pr-1">
                <span className="text-[8px] sm:text-xs text-white/60">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <div className="text-white text-base sm:text-2xl font-bold">{Math.round(effectiveThrottle)}%</div>

          <input
            type="range"
            min="0"
            max="100"
            value={effectiveThrottle}
            onChange={(e) => handleSetThrottle(Number(e.target.value))}
            className="w-16 sm:w-24 h-2 appearance-none bg-gray-700 rounded-lg cursor-pointer accent-green-500"
          />

          <button
            onClick={handleToggleEngine}
            onMouseUp={() => {
              if (usePhysics && keyPosition === 'start' && !effectiveIsRunning) {
                physicsEngine.turnKeyToRun();
              }
            }}
            className={`px-2 sm:px-6 py-1.5 sm:py-3 rounded-lg font-semibold text-white text-xs sm:text-base transition-all duration-200 ${buttonState.color} shadow-lg`}
          >
            {buttonState.text}
          </button>
          
          <button
            onClick={() => physicsEngine.togglePhysicsMode()}
            className={`mt-1 sm:mt-2 px-2 py-1 rounded text-[10px] sm:text-xs font-semibold transition-all ${
              usePhysics
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-600 hover:bg-gray-700 text-gray-300"
            }`}
          >
            {usePhysics ? "PHYSICS" : "SIMPLE"}
          </button>
        </div>
      </div>
    </div>
  );
}
