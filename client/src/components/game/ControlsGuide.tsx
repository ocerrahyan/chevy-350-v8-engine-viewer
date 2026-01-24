export function ControlsGuide() {
  return (
    <div className="absolute bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 rounded-xl border border-white/10 hidden sm:block">
      <div className="flex items-center gap-4 sm:gap-8 text-white/70 text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <kbd className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white/10 rounded text-[10px] sm:text-xs font-mono">W/S</kbd>
          <span>Throttle</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <kbd className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white/10 rounded text-[10px] sm:text-xs font-mono">Space</kbd>
          <span>Start/Stop</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Mouse</kbd>
          <span>Rotate</span>
        </div>
      </div>
    </div>
  );
}
