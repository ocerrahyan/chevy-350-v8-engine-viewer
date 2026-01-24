import { useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";

interface ViewPreset {
  name: string;
  position: [number, number, number];
  target?: [number, number, number];
  icon: string;
}

const VIEW_PRESETS: ViewPreset[] = [
  { name: "Front", position: [0, 0.5, 4], icon: "⬆" },
  { name: "Rear", position: [0, 0.5, -4], icon: "⬇" },
  { name: "Right", position: [4, 0.5, 0], icon: "➡" },
  { name: "Left", position: [-4, 0.5, 0], icon: "⬅" },
  { name: "Top", position: [0, 5, 0.01], icon: "🔝" },
  { name: "Bottom", position: [0, -3, 0.01], icon: "🔽" },
  { name: "Iso", position: [3, 2.5, 3], icon: "🔷" },
  { name: "Under", position: [2, -1.5, 2], icon: "⤵" },
];

export function ViewPresetsController({ 
  activeView, 
  onViewChange 
}: { 
  activeView: string | null;
  onViewChange: (view: string | null) => void;
}) {
  const { camera, controls } = useThree();
  const isAnimating = useRef(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activeView) return;
    
    const preset = VIEW_PRESETS.find(p => p.name === activeView);
    if (!preset) return;

    const targetPos = new THREE.Vector3(...preset.position);
    const targetLook = new THREE.Vector3(...(preset.target || [0, 0, 0]));
    const startPos = camera.position.clone();
    const startTime = Date.now();
    const duration = 800;

    isAnimating.current = true;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, targetPos, eased);
      camera.lookAt(targetLook);

      if (controls && 'target' in controls) {
        (controls as any).target.copy(targetLook);
        (controls as any).update();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isAnimating.current = false;
        onViewChange(null);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeView, camera, controls, onViewChange]);

  return null;
}

export function ViewPresetsUI({ onSelectView }: { onSelectView: (view: string) => void }) {
  return (
    <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1">
      <div className="bg-black/80 backdrop-blur-md rounded-lg p-1.5 border border-white/10">
        <div className="text-white/60 text-[10px] text-center mb-1 font-medium">VIEWS</div>
        <div className="grid grid-cols-2 gap-1">
          {VIEW_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onSelectView(preset.name)}
              className="w-10 h-8 bg-gray-800 hover:bg-gray-700 text-white text-[10px] rounded flex flex-col items-center justify-center transition-colors border border-white/5 hover:border-white/20"
              title={preset.name}
            >
              <span className="text-sm leading-none">{preset.icon}</span>
              <span className="text-[8px] text-white/60">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
