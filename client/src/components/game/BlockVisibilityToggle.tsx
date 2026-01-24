import { useEngine } from "@/lib/stores/useEngine";

export function BlockVisibilityToggle() {
  const blockVisible = useEngine((state) => state.blockVisible);
  const toggleBlockVisible = useEngine((state) => state.toggleBlockVisible);

  return (
    <button
      onClick={toggleBlockVisible}
      className={`absolute top-32 right-4 z-10 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
        blockVisible
          ? "bg-black/80 text-white border border-white/20 hover:bg-black/90"
          : "bg-amber-500 text-black border-2 border-amber-600"
      }`}
      title="Toggle engine block visibility to see rotating assembly (improves FPS)"
    >
      {blockVisible ? "BLOCK: ON" : "BLOCK: OFF"}
    </button>
  );
}
