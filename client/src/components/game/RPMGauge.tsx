import { useEngine } from "@/lib/stores/useEngine";
import { usePhysicsEngine } from "@/lib/stores/usePhysicsEngine";
import { useMemo } from "react";

export function RPMGauge() {
  const { currentRPM, maxRPM, isRunning } = useEngine();
  const physicsEngine = usePhysicsEngine();
  const usePhysicsMode = physicsEngine.usePhysicsMode;
  
  const effectiveRPM = usePhysicsMode ? physicsEngine.getRPM() : currentRPM;
  const effectiveIsRunning = usePhysicsMode ? physicsEngine.isRunning : isRunning;

  const rpmPercentage = useMemo(() => {
    return Math.min((effectiveRPM / maxRPM) * 100, 100);
  }, [effectiveRPM, maxRPM]);

  const needleRotation = useMemo(() => {
    const minAngle = -135;
    const maxAngle = 135;
    return minAngle + (rpmPercentage / 100) * (maxAngle - minAngle);
  }, [rpmPercentage]);

  const rpmColor = useMemo(() => {
    if (rpmPercentage > 85) return "text-red-500";
    if (rpmPercentage > 70) return "text-orange-500";
    if (rpmPercentage > 50) return "text-yellow-500";
    return "text-green-500";
  }, [rpmPercentage]);

  const tickMarks = useMemo(() => {
    const marks = [];
    for (let i = 0; i <= 8; i++) {
      const angle = -135 + (i / 8) * 270;
      const isRedZone = i >= 6;
      marks.push({
        angle,
        label: i,
        isRedZone,
      });
    }
    return marks;
  }, []);

  return (
    <div className="absolute right-2 sm:right-4 md:right-6 top-16 sm:top-6 bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 rounded-xl border border-white/10">
      <div className="relative w-24 h-24 sm:w-36 sm:h-36 md:w-48 md:h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#333"
            strokeWidth="8"
          />
          
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#rpmGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(rpmPercentage / 100) * 424} 424`}
            transform="rotate(-135 100 100)"
            className="transition-all duration-100"
          />

          <defs>
            <linearGradient id="rpmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {tickMarks.map(({ angle, label, isRedZone }) => {
            const rad = (angle * Math.PI) / 180;
            const innerRadius = 70;
            const outerRadius = 82;
            const labelRadius = 58;
            
            return (
              <g key={label}>
                <line
                  x1={100 + innerRadius * Math.cos(rad)}
                  y1={100 + innerRadius * Math.sin(rad)}
                  x2={100 + outerRadius * Math.cos(rad)}
                  y2={100 + outerRadius * Math.sin(rad)}
                  stroke={isRedZone ? "#ef4444" : "#fff"}
                  strokeWidth="2"
                />
                <text
                  x={100 + labelRadius * Math.cos(rad)}
                  y={100 + labelRadius * Math.sin(rad)}
                  fill={isRedZone ? "#ef4444" : "#fff"}
                  fontSize="12"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}

          <line
            x1="100"
            y1="100"
            x2="100"
            y2="40"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${needleRotation} 100 100)`}
            className="transition-transform duration-100"
          />

          <circle cx="100" cy="100" r="8" fill="#fff" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 sm:pt-12 md:pt-16">
          <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${rpmColor} transition-colors duration-100`}>
            {Math.round(effectiveRPM)}
          </div>
          <div className="text-white/50 text-[10px] sm:text-xs md:text-sm uppercase tracking-wider">RPM</div>
        </div>
      </div>

      <div className="mt-2 sm:mt-4 flex items-center justify-center gap-1 sm:gap-2">
        <div
          className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
            effectiveIsRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"
          }`}
        />
        <span className="text-white/70 text-[10px] sm:text-xs md:text-sm">
          {effectiveIsRunning ? "Running" : "Off"}
        </span>
      </div>
      
      {usePhysicsMode && (
        <div className="mt-2 text-center">
          <div className="text-[10px] text-blue-400 font-semibold">PHYSICS MODE</div>
        </div>
      )}
    </div>
  );
}
