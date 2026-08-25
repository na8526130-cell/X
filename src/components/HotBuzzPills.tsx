import React from "react";
import { HotBuzzItem } from "../types";
import { Sparkles, TrendingUp, ChevronRight } from "lucide-react";

interface HotBuzzPillsProps {
  items: HotBuzzItem[];
  onSelectKeyword: (keyword: string) => void;
}

export const HotBuzzPills: React.FC<HotBuzzPillsProps> = ({ items, onSelectKeyword }) => {
  if (!items || items.length === 0) return null;

  return (
    <div id="hot-buzz-section" className="bg-zinc-950/90 border border-zinc-900 rounded-2xl p-3.5 sm:p-4 mb-6 shadow-md">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="p-1 rounded-lg bg-red-600/20 text-red-400 border border-red-600/30">
          <TrendingUp className="w-4 h-4 text-red-500" />
        </div>
        <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          急上昇バズワード
          <span className="text-[11px] font-normal text-zinc-400">（クリックで最新ポストを即時検索・表示）</span>
        </h3>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {items.map((item, idx) => (
          <button
            key={`hot-${idx}-${item.query}`}
            id={`hot-buzz-pill-${idx}`}
            onClick={() => onSelectKeyword(item.query)}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-red-600/50 text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <span className="text-red-500 text-[11px] font-bold">#</span>
            <span className="font-bold">{item.query}</span>
            <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-red-400 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
};
