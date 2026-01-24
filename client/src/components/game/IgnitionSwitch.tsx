import { usePhysicsEngine } from "@/lib/stores/usePhysicsEngine";
import { Key, Power, Loader2 } from "lucide-react";
import { useRef, useEffect } from "react";

export function IgnitionSwitch() {
  const { 
    keyPosition, 
    isRunning, 
    isCranking,
    starterState,
    turnKeyToStart, 
    turnKeyToRun, 
    turnKeyOff,
    getRPM,
  } = usePhysicsEngine();
  
  const crankingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (crankingTimeoutRef.current) {
        clearTimeout(crankingTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseDown = () => {
    if (keyPosition === 'off') {
      turnKeyToStart();
    }
  };

  const handleMouseUp = () => {
    if (keyPosition === 'start') {
      crankingTimeoutRef.current = setTimeout(() => {
        if (!isRunning) {
          turnKeyToRun();
        }
      }, 100);
    }
  };

  const handleClick = () => {
    if (keyPosition === 'run') {
      turnKeyOff();
    }
  };

  const getKeyRotation = () => {
    switch (keyPosition) {
      case 'off': return 'rotate-[-45deg]';
      case 'run': return 'rotate-0';
      case 'start': return 'rotate-[45deg]';
    }
  };

  const getStatusColor = () => {
    if (isRunning) return 'bg-green-500';
    if (keyPosition === 'start' || isCranking) return 'bg-yellow-500 animate-pulse';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isRunning) return 'RUNNING';
    if (keyPosition === 'start' || isCranking) return 'CRANKING';
    if (keyPosition === 'run') return 'KEY ON';
    return 'OFF';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs text-white/60 uppercase tracking-wider">Ignition</div>
      
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 border-4 border-zinc-600 flex items-center justify-center shadow-lg">
          <button
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            className={`w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-500 flex items-center justify-center transition-transform duration-200 ${getKeyRotation()} hover:border-zinc-400 active:scale-95`}
          >
            {(keyPosition === 'start' || isCranking) ? (
              <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
            ) : (
              <Key className="w-6 h-6 text-zinc-300" />
            )}
          </button>
        </div>
        
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-[10px] text-white/40">START</div>
        <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 text-[10px] text-white/40">RUN</div>
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[10px] text-white/40">OFF</div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-sm font-mono text-white/80">{getStatusText()}</span>
      </div>

      {starterState.overheated && (
        <div className="text-xs text-red-400 animate-pulse">STARTER OVERHEATED</div>
      )}

      <div className="text-xs text-white/40 text-center">
        {keyPosition === 'off' && "Hold to crank"}
        {keyPosition === 'start' && "Cranking..."}
        {keyPosition === 'run' && isRunning && "Click to stop"}
        {keyPosition === 'run' && !isRunning && "Click to retry"}
      </div>
    </div>
  );
}
