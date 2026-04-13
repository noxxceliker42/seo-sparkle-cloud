import { Button } from "@/components/ui/button";
import { Zap, Cpu } from "lucide-react";

interface ModeToggleProps {
  mode: "standard" | "kieai";
  onModeChange: (mode: "standard" | "kieai") => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
      <Button
        variant={mode === "standard" ? "default" : "ghost"}
        size="sm"
        onClick={() => onModeChange("standard")}
        className="min-h-[36px] gap-1.5 text-sm"
      >
        <Cpu className="h-4 w-4" />
        Standard
      </Button>
      <Button
        variant={mode === "kieai" ? "default" : "ghost"}
        size="sm"
        onClick={() => onModeChange("kieai")}
        className="min-h-[36px] gap-1.5 text-sm"
      >
        <Zap className="h-4 w-4" />
        Kie.AI Live
      </Button>
    </div>
  );
}
