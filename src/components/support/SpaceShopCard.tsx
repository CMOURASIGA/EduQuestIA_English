import React from "react";
import { ShopItem } from "../../types/shop";
import { SHOP_ITEMS, isItemUnlocked } from "../../services/shopStorage";
import { Sparkles, ShoppingBag, CheckCircle, Flame, Star, Zap } from "lucide-react";

interface SpaceShopCardProps {
  onSelectItem: (item: ShopItem) => void;
  className?: string;
}

export default function SpaceShopCard({ onSelectItem, className = "" }: SpaceShopCardProps) {
  return (
    <div className={`flex flex-col gap-5 ${className}`} id="space-shop-catalog-card">
      <div className="flex items-center justify-between border-b border-indigo-50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <ShoppingBag size={20} className="stroke-[2.5px]" />
          </div>
          <div>
            <h3 className="font-black text-[#1A1C3D] text-lg">Loja Espacial de Gamificação 🌌</h3>
            <p className="text-indigo-600 text-[11px] font-bold uppercase tracking-wider">Apoio Divertido & Customização</p>
          </div>
        </div>
        <span className="text-3xl select-none animate-pulse">🛸</span>
      </div>

      <p className="text-slate-500 text-xs font-semibold leading-relaxed">
        Adquira pacotes de emojis lendários para personalizar seu perfil espacial ou impulsione seu nível com boosts de XP! Cada transação é convertida em recursos diretos para manter o EduQuest online e gratuito!
      </p>

      {/* Grid of Shop Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        {SHOP_ITEMS.map((item) => {
          const unlocked = isItemUnlocked(item.id);
          const isEmojiPack = item.type.startsWith("emoji_pack");
          
          return (
            <div 
              key={item.id}
              className="bg-slate-50 hover:bg-indigo-50/20 border border-slate-100 hover:border-indigo-100 rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-xs group relative overflow-hidden"
            >
              {/* Micro badge indicator */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full -mr-4 -mt-4 transition-all group-hover:scale-110" />

              <div className="space-y-2">
                <div className="flex items-start justify-between relative">
                  <div className="w-11 h-11 bg-white border border-slate-100 text-2xl rounded-2xl flex items-center justify-center shadow-xs">
                    {item.icon}
                  </div>
                  
                  {isEmojiPack && unlocked ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs border border-emerald-200">
                      <CheckCircle size={10} className="fill-current" /> Adquirido
                    </span>
                  ) : (
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-black px-2.5 py-0.5 rounded-full">
                      R$ {item.price.toFixed(2)}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-black text-[#1A1C3D] text-sm group-hover:text-indigo-950 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-slate-500 text-[11px] font-semibold leading-snug mt-1">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Purchase action button */}
              {isEmojiPack && unlocked ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 bg-slate-100 text-slate-400 border border-slate-100 font-black text-xs rounded-xl flex items-center justify-center gap-1 cursor-default"
                >
                  Já está Ativo no Perfil
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-sm group-hover:shadow-md shadow-indigo-600/10"
                >
                  <Sparkles size={12} />
                  Adquirir via Pix
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
