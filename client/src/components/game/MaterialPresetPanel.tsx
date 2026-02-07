import { useEngine } from "@/lib/stores/useEngine";

const presets = [
  { key: "default", label: "DEFAULT" },
  { key: "metallic", label: "METALLIC" },
  { key: "matte", label: "MATTE" },
  { key: "colored", label: "COLORED" },
] as const;

export function MaterialPresetPanel() {
  const wireframeMode = useEngine((state) => state.wireframeMode);
  const materialPreset = useEngine((state) => state.materialPreset);
  const toggleWireframe = useEngine((state) => state.toggleWireframe);
  const setMaterialPreset = useEngine((state) => state.setMaterialPreset);

  return (
    <div className="fixed top-[7.5rem] right-4 z-50 bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-3">
      <div className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-2">
        Materials
      </div>
      <button
        onClick={toggleWireframe}
        className={`w-full text-xs py-1.5 px-3 rounded-md font-medium transition-all mb-2 ${
          wireframeMode
            ? "bg-white text-black"
            : "bg-white/10 text-white/70 hover:bg-white/20"
        }`}
      >
        WIREFRAME: {wireframeMode ? "ON" : "OFF"}
      </button>
      <div className="flex flex-col gap-1">
        {presets.map((preset) => (
          <button
            key={preset.key}
            onClick={() => setMaterialPreset(preset.key)}
            className={`text-xs py-1.5 px-3 rounded-md font-medium transition-all ${
              materialPreset === preset.key
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
