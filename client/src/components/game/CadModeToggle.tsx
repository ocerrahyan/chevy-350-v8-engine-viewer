import { useEngine } from "@/lib/stores/useEngine";

export function CadModeToggle() {
  const cadMode = useEngine((state) => state.cadMode);
  const toggleCadMode = useEngine((state) => state.toggleCadMode);

  return (
    <button
      onClick={toggleCadMode}
      className={`absolute top-20 right-4 z-10 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
        cadMode
          ? "bg-white text-black border-2 border-black"
          : "bg-black/80 text-white border border-white/20 hover:bg-black/90"
      }`}
      title="Toggle CAD wireframe mode for better performance"
    >
      {cadMode ? "CAD: ON" : "CAD: OFF"}
    </button>
  );
}
