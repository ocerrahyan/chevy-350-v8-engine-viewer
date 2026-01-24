import { Button } from "@/components/ui/button";
import { useEngine } from "@/lib/stores/useEngine";
import { Eye, EyeOff } from "lucide-react";

export function XRayToggle() {
  const { xrayMode, toggleXrayMode } = useEngine();
  
  return (
    <div className="fixed top-4 left-[140px] z-50">
      <Button 
        onClick={toggleXrayMode}
        variant={xrayMode ? "default" : "outline"}
        className={`
          font-mono text-sm px-4 py-2 
          ${xrayMode 
            ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-500" 
            : "bg-black/50 hover:bg-black/70 text-white border-white/30"
          }
          backdrop-blur-sm transition-all duration-200
        `}
      >
        {xrayMode ? (
          <>
            <Eye className="w-4 h-4 mr-2" />
            X-RAY ON
          </>
        ) : (
          <>
            <EyeOff className="w-4 h-4 mr-2" />
            X-RAY OFF
          </>
        )}
      </Button>
    </div>
  );
}
