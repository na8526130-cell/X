import React from "react";
import { BuzzTrendItem } from "../types";
import { Trophy, Activity, MessageSquareText, Heart, AlertTriangle } from "lucide-react";

interface StatsBarProps {
  trends: BuzzTrendItem[];
  totalDelaysCount: number;
  onSelectKeyword: (keyword: string) => void;
  onOpenTrains: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  trends,
  totalDelaysCount,
  onSelectKeyword,
  onOpenTrains,
}) => {
  if (!trends || trends.length === 0) return null;

  const top1 = trends[0];
  const totalVolume = trends.reduce((acc, curr) => acc + (curr.tweetCount || 0), 0);

  // Find highest positive sentiment topic
  const highestPositive = [...trends]
    .filter((t) => (t.positive || 0) > 0)
    .sort((a, b) => (b.positive || 0) - (a.positive || 0))[0];

  // Genre breakdown
  const genreCounts: Record<string, number> = {};
  for (const t of trends) {
    const g = t.genre || "一般";
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  }
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div id="stats-overview-grid" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* 1st Place Trend Card in Red and Black */}
      <div
        id="stat-card-top1"
        onClick={() => top1 && onSelectKeyword(top1.query)}
        className="bg-zinc-950/90 border border-red-800/40 hover:border-red-500 rounded-2xl p-3.5 transition-all cursor-pointer group shadow-lg shadow-red-950/30 relative overflow-hidden"
      >
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-red-600/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
          <span className="font-bold flex items-center gap-1 text-red-400">
            <Trophy className="w-3.5 h-3.5 text-red-500" /> 𝕏 トレンド 1位
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 font-mono font-bold border border-red-600/30">
            {top1.tweetCount ? `${top1.tweetCount.toLocaleString()}件` : "急上昇"}
          </span>
        </div>
        <div className="font-black text-white text-sm sm:text-base truncate group-hover:text-red-400 transition-colors">
          {top1 ? top1.query : "取得中..."}
        </div>
        <div className="text-[11px] text-zinc-400 truncate mt-1">
          {top1.childBuzz && top1.childBuzz.length > 0 ? `関連: ${top1.childBuzz.slice(0, 2).join(", ")}` : top1.genre}
        </div>
      </div>

      {/* Total Volume Card */}
      <div id="stat-card-volume" className="bg-zinc-950/90 border border-zinc-900 rounded-2xl p-3.5 shadow-md">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
          <span className="font-semibold flex items-center gap-1 text-zinc-300">
            <MessageSquareText className="w-3.5 h-3.5 text-red-500" /> トレンド総ポスト数
          </span>
          <span className="text-[10px] text-zinc-500">上位20件</span>
        </div>
        <div className="font-black text-white text-sm sm:text-base font-mono">
          {totalVolume > 0 ? `${totalVolume.toLocaleString()}` : "集計中"}
          <span className="text-xs font-normal text-zinc-400 ml-1">posts</span>
        </div>
        <div className="text-[11px] text-zinc-400 truncate mt-1">
          最多ジャンル: <span className="text-zinc-200 font-medium">{topGenre ? `${topGenre[0]} (${topGenre[1]}件)` : "一般"}</span>
        </div>
      </div>

      {/* Positive Mood Highlight */}
      <div
        id="stat-card-positive"
        onClick={() => highestPositive && onSelectKeyword(highestPositive.query)}
        className={`bg-zinc-950/90 border border-zinc-900 rounded-2xl p-3.5 shadow-md ${
          highestPositive ? "cursor-pointer hover:border-red-600/40 group" : ""
        }`}
      >
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
          <span className="font-semibold flex items-center gap-1 text-zinc-300">
            <Heart className="w-3.5 h-3.5 text-red-500" /> 好感度トップ
          </span>
          {highestPositive && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-600/15 text-red-300 font-mono font-bold">
              {highestPositive.positive}% 好意
            </span>
          )}
        </div>
        <div className="font-bold text-white text-sm sm:text-base truncate group-hover:text-red-400 transition-colors">
          {highestPositive ? highestPositive.query : "集計中"}
        </div>
        <div className="text-[11px] text-zinc-400 truncate mt-1">
          {highestPositive ? `#${highestPositive.rank}位 • ${highestPositive.genre}` : "好評価な話題"}
        </div>
      </div>

      {/* Railway Delays Status */}
      <div
        id="stat-card-railway"
        onClick={onOpenTrains}
        className={`bg-zinc-950/90 border rounded-2xl p-3.5 shadow-md cursor-pointer transition-all ${
          totalDelaysCount > 0
            ? "border-red-600/50 hover:border-red-500 bg-red-950/10"
            : "border-zinc-900 hover:border-zinc-800"
        }`}
      >
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
          <span className="font-semibold flex items-center gap-1 text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-red-500" /> 鉄道運行アラート
          </span>
          {totalDelaysCount > 0 ? (
            <span className="text-[11px] px-2 py-0.5 rounded bg-red-600/20 text-red-300 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              {totalDelaysCount}路線遅延
            </span>
          ) : (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
              平常運転
            </span>
          )}
        </div>
        <div className="font-bold text-white text-sm sm:text-base truncate">
          {totalDelaysCount > 0 ? "遅延・運休情報あり" : "全国主要路線 平常運転"}
        </div>
        <div className="text-[11px] text-red-400 truncate mt-1 flex items-center gap-1">
          <span>クリックで運行路線を確認 →</span>
        </div>
      </div>
    </div>
  );
};
