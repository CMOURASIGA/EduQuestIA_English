import React from "react";
import { Heart, Sparkles, Award } from "lucide-react";
import { isSupporterActive } from "../../services/supportStorage";

interface SupportEntryCardProps {
  onOpenSupport: () => void;
  className?: string;
}

export default function SupportEntryCard({
  onOpenSupport,
  className = ""
}: SupportEntryCardProps) {
  const active = isSupporterActive();

  return (
    <div 
      className={`relative overflow-hidden bg-white rounded-[32px] border border-slate-100 p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.02)] ${className}`}
      id="support-entry-card-container"
    >
      {/* Visual background blobs */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-pink-50 rounded-full blur-2xl -ml-4 -mb-4 pointer-events-none" />

      <div className="relative space-y-3">
        <div className="flex justify-between items-start">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
            <Heart size={20} className="fill-current" />
          </div>
          {active && (
            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-200">
              <Award size={10} className="fill-current" /> Selo Ativo
            </span>
          )}
        </div>

        <div>
          <h4 className="font-black text-[#1A1C3D] text-sm">Apoie o EduQuest IA</h4>
          <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-relaxed">
            Ajude o EduQuest a continuar gratuito e livre de anúncios para milhares de famílias de todo o Brasil.
          </p>
        </div>
      </div>

      <div className="mt-5 relative">
        <button
          onClick={onOpenSupport}
          className={`w-full py-3.5 px-4 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
            active
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
              : "bg-sky-500 text-white hover:bg-sky-600 shadow-md shadow-sky-500/10 hover:scale-[1.01] active:scale-98"
          }`}
          id="support-entry-card-action-btn"
        >
          <Sparkles size={12} />
          {active ? "Ver Detalhes do Apoio" : "Apoiar Projeto"}
        </button>
      </div>
    </div>
  );
}
