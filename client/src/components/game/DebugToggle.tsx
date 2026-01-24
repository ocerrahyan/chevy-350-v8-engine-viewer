import { Button } from "@/components/ui/button";

interface DebugToggleProps {
  debugMode: boolean;
  onToggle: () => void;
}

const CHEVY_350_SPECS = {
  bore: '4.000"',
  stroke: '3.480"',
  rodLength: '5.700"',
  rodStrokeRatio: '1.637:1',
  crankRadius: '1.740"',
  bankAngle: '90°',
  firingOrder: '1-8-4-3-6-5-7-2',
  journalAngles: ['0°', '90°', '180°', '270°'],
};

export function DebugToggle({ debugMode, onToggle }: DebugToggleProps) {
  return (
    <div className="fixed top-4 left-4 z-50">
      <Button 
        onClick={onToggle}
        variant={debugMode ? "default" : "outline"}
        className={`
          font-mono text-sm px-4 py-2 
          ${debugMode 
            ? "bg-green-600 hover:bg-green-700 text-white border-green-500" 
            : "bg-black/50 hover:bg-black/70 text-white border-white/30"
          }
          backdrop-blur-sm transition-all duration-200
        `}
      >
        {debugMode ? "🔧 DEBUG ON" : "🔧 DEBUG OFF"}
      </Button>
      
      {debugMode && (
        <div className="mt-2 space-y-2">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs font-mono text-white border border-white/20 max-w-[220px]">
            <div className="font-bold mb-2 text-green-400">Debug Legend:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                <span>Crankpin center (animated)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
                <span>Crankshaft journal pins</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
                <span>Wrist pin / Rod small end</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>
                <span>Crankshaft centerline axis</span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs font-mono text-white border border-amber-500/40 max-w-[220px]">
            <div className="font-bold mb-2 text-amber-400">Chevy 350 Specs:</div>
            <div className="space-y-0.5 text-gray-300">
              <div className="flex justify-between">
                <span>Bore:</span>
                <span className="text-white">{CHEVY_350_SPECS.bore}</span>
              </div>
              <div className="flex justify-between">
                <span>Stroke:</span>
                <span className="text-white">{CHEVY_350_SPECS.stroke}</span>
              </div>
              <div className="flex justify-between">
                <span>Rod Length:</span>
                <span className="text-white">{CHEVY_350_SPECS.rodLength}</span>
              </div>
              <div className="flex justify-between">
                <span>Rod/Stroke:</span>
                <span className="text-white">{CHEVY_350_SPECS.rodStrokeRatio}</span>
              </div>
              <div className="flex justify-between">
                <span>Crank Throw:</span>
                <span className="text-white">{CHEVY_350_SPECS.crankRadius}</span>
              </div>
              <div className="flex justify-between">
                <span>V-Angle:</span>
                <span className="text-white">{CHEVY_350_SPECS.bankAngle}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="text-gray-400 text-[10px]">Cross-plane Crank:</div>
              <div className="flex gap-1 mt-1">
                {CHEVY_350_SPECS.journalAngles.map((angle, i) => (
                  <span key={i} className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
                    J{i+1}: {angle}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="text-gray-400 text-[10px]">Firing Order:</div>
              <div className="text-cyan-400 mt-1">{CHEVY_350_SPECS.firingOrder}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
