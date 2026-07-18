import React from "react";
import { Award, Sparkles } from "lucide-react";
import { isSupporterActive } from "../../services/supportStorage";

interface SupporterBadgeProps {
  className?: string;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function SupporterBadge({
  className = "",
  showTooltip = true,
  size = "md"
}: SupporterBadgeProps) {
  const active = isSupporterActive();

  if (!active) return null;

  const sizeClasses = {
    sm: "px-2.5 py-1 text-[10px] gap-1 rounded-full",
    md: "px-3.5 py-1.5 text-xs gap-1.5 rounded-full",
    lg: "px-5 py-2.5 text-sm gap-2 rounded-2xl"
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18
  };

  return (
    <div 
      className={`relative group inline-flex items-center ${sizeClasses[size]} bg-linear-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-300/60 text-amber-700 font-extrabold select-none ${className}`}
      id="supporter-visual-badge"
    >
      <Award size={iconSizes[size]} className="text-amber-500 fill-amber-500/10 animate-pulse shrink-0" />
      <span className="tracking-wide">Apoiador EduQuest</span>
      <Sparkles size={iconSizes[size] - 2} className="text-amber-400 shrink-0" />

      {/* Tooltip description */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 scale-0 group-hover:scale-100 transition-all duration-200 origin-bottom bg-slate-950 text-white text-[10px] p-3 rounded-xl shadow-xl z-50 text-center leading-relaxed pointer-events-none border border-slate-800">
          <p className="font-bold text-amber-300 mb-0.5">Selo Cosmético Oficial</p>
          Esta família ajudou o EduQuest a continuar evoluindo e mantendo o inglês divertido e gratuito!
        </div>
      )}
    </div>
  );
}
