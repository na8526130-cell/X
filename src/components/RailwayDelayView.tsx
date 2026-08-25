import React, { useState } from "react";
import { DelayRailData } from "../types";
import { Train, AlertTriangle, CheckCircle, Search, ExternalLink } from "lucide-react";

interface RailwayDelayViewProps {
  delayData: DelayRailData;
  onSelectKeyword: (keyword: string) => void;
}

export const RailwayDelayView: React.FC<RailwayDelayViewProps> = ({ delayData, onSelectKeyword }) => {
  const tabItems = delayData?.tabItems || [];
  const areaItems = delayData?.areaItems || {};

  const [selectedTab, setSelectedTab] = useState<string>(tabItems[0] || "関東");
  const [searchTerm, setSearchTerm] = useState("");

  const currentAreaDelays = areaItems[selectedTab] || [];
  const filteredDelays = currentAreaDelays.filter((d) =>
    d.railName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Total delays across all areas
  const totalDelays = Object.values(areaItems).reduce<number>(
    (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
    0
  );

  return (
    <div id="railway-delay-view" className="bg-zinc-950/90 border border-zinc-900 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30">
            <Train className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-white text-base sm:text-lg">
                リアルタイム 鉄道遅延・運行状況
              </h3>
              {totalDelays > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 font-mono font-bold text-xs border border-red-600/30">
                  全国 {totalDelays}路線に遅延
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold text-xs">
                  全国 平常運転
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              路線名をクリックすると、X（Twitter）での乗客の生の声・混雑・遅延原因ポストを即時検索します
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="search-railway-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="路線名を絞り込み..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Area Tabs */}
      {tabItems.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {tabItems.map((tab) => {
            const count = (areaItems[tab] || []).length;
            const isSelected = selectedTab === tab;

            return (
              <button
                key={tab}
                id={`rail-tab-${tab}`}
                onClick={() => setSelectedTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                <span>{tab}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isSelected ? "bg-black/40 text-white" : "bg-red-950 text-red-300"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Delays Grid for Current Area */}
      {filteredDelays.length === 0 ? (
        <div className="bg-black/60 border border-zinc-900 rounded-2xl p-8 text-center text-zinc-400 space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="font-bold text-white text-sm">
            {searchTerm
              ? "該当する路線が見つかりませんでした。"
              : `${selectedTab}エリアは現在、報告されている大幅な遅延はありません。`}
          </p>
          <p className="text-xs text-zinc-500">平常通りの運行が見込まれます。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDelays.map((rail, idx) => (
            <div
              key={`delay-${selectedTab}-${idx}`}
              id={`delay-card-${selectedTab}-${idx}`}
              onClick={() => onSelectKeyword(rail.railName)}
              className="bg-zinc-950 hover:bg-zinc-900 border border-red-900/30 hover:border-red-600/50 rounded-xl p-3.5 transition-all shadow-md cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-sm group-hover:text-red-400 transition-colors truncate">
                    {rail.railName}
                  </h4>
                  <span className="text-[10px] text-zinc-500">タップで生の声・遅延ポストを表示</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      `https://x.com/search?q=${encodeURIComponent(rail.railName)}&f=live`,
                      "_blank"
                    );
                  }}
                  className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Xで直接検索"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
