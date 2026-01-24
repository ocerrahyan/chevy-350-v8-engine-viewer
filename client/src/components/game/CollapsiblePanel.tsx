import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsiblePanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  icon?: ReactNode;
}

export function CollapsiblePanel({ 
  title, 
  children, 
  defaultOpen = true,
  className = "",
  icon
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-white/90 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/60" />
        )}
      </button>
      
      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <div className="p-3 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MobileControlsWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto">
      <div className="flex flex-col gap-2 p-2 md:p-0 max-h-[50vh] md:max-h-none overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
