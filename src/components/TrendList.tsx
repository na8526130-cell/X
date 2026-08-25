import React, { useState, useMemo } from "react";
import { BuzzTrendItem } from "../types";
import {
  TrendingUp,
  ArrowUpRight,
  Search,
  ExternalLink,
  Copy,
  Check,
  LayoutList,
  LayoutGrid,
  TableProperties,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Filter,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TrendListProps {
  trends: BuzzTrendItem[];
  onSelectKeyword: (keyword: string) => void;
  isLoading: boolean;
}

type ViewMode = "bars" | "grid" | "table";
type SortOption = "rank" | "volume" | "rankUp" | "positive";

export const TrendList: React.FC<TrendListProps> = ({
  trends,
  onSelectKeyword,
  isLoading,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("bars");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [filterText, setFilterText] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>("rank");
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  // Extract unique genres
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const t of trends) {
      if (t.genre) set.add(t.genre);
    }
    return Array.from(set);
  }, [trends]);

  // Max tweet count for calculating relative bar width
  const maxTweetCount = useMemo(() => {
    const counts = trends.map((t) => t.tweetCount || 0);
    return Math.max(...counts, 100);
  }, [trends]);

  // Filtered and sorted trends
  const processedTrends = useMemo(() => {
    let list = [...trends];

    // Filter by genre
    if (selectedGenre !== "all") {
      list = list.filter((t) => t.genre === selectedGenre);
    }

    // Filter by text search
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter(
        (t) =>
          t.query.toLowerCase().includes(q) ||
          t.childBuzz?.some((cb) => cb.toLowerCase().includes(q)) ||
          t.genre?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortOption === "volume") {
      list.sort((a, b) => (b.tweetCount || 0) - (a.tweetCount || 0));
    } else if (sortOption === "rankUp") {
      list.sort((a, b) => (b.rankDiff || 0) - (a.rankDiff || 0));
    } else if (sortOption === "positive") {
      list.sort((a, b) => (b.positive || 0) - (a.positive || 0));
    } else {
      // Default rank order
      list.sort((a, b) => a.rank - b.rank);
    }

    return list;
  }, [trends, selectedGenre, filterText, sortOption]);

  // Handle copy keyword
  const handleCopy = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    setTimeout(() => {
      setCopiedKeyword(null);
    }, 1500);
  };

  // Genre badge color helper (Red and Black accent palette)
  const getGenreBadgeClass = (genre: string) => {
    switch (genre) {
      case "アニメ・ゲーム":
        return "bg-red-950/40 text-red-300 border-red-800/40";
      case "ITビジネス":
        return "bg-zinc-900 text-zinc-300 border-zinc-700/60";
      case "エンタメ":
        return "bg-red-900/30 text-red-200 border-red-700/40";
      case "スポーツ":
        return "bg-zinc-800 text-zinc-200 border-zinc-700";
      default:
        return "bg-zinc-900 text-zinc-400 border-zinc-800";
    }
  };

  // Rank badge styling helper (Red & Gold & Dark silver)
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return "bg-gradient-to-br from-red-500 via-red-600 to-red-800 text-white font-black shadow-md shadow-red-600/40 border border-red-400";
    }
    if (rank === 2) {
      return "bg-gradient-to-br from-zinc-200 to-zinc-400 text-black font-black shadow-md shadow-zinc-400/20";
    }
    if (rank === 3) {
      return "bg-gradient-to-br from-zinc-600 to-zinc-800 text-zinc-100 font-black shadow-md border border-zinc-600";
    }
    return "bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold";
  };

  return (
    <div id="trend-list-container" className="space-y-4">
      {/* Control Bar: Filters, Search, View Mode, Sort */}
      <div className="bg-zinc-950/90 border border-zinc-900 rounded-2xl p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
        {/* Genre Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            id="genre-filter-all"
            onClick={() => setSelectedGenre("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedGenre === "all"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            すべて ({trends.length})
          </button>
          {availableGenres.map((g) => (
            <button
              key={g}
              id={`genre-filter-${g}`}
              onClick={() => setSelectedGenre(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedGenre === g
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Secondary Controls: Search, Sort, View toggle */}
        <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
          {/* In-list search */}
          <div className="relative flex-1 sm:w-48 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="filter-trends-input"
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="キーワード絞り込み..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center bg-zinc-900 rounded-xl p-0.5 border border-zinc-800 text-xs">
            <BarChart3 className="w-3.5 h-3.5 ml-2 text-red-500" />
            <select
              id="sort-trends-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-zinc-300 py-1.5 px-2 text-xs focus:outline-none cursor-pointer"
            >
              <option value="rank" className="bg-zinc-900 text-white">順位順 (1位〜)</option>
              <option value="volume" className="bg-zinc-900 text-white">ポスト数順 (多い順)</option>
              <option value="rankUp" className="bg-zinc-900 text-white">急上昇度順</option>
              <option value="positive" className="bg-zinc-900 text-white">好感度 (ポジティブ率)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-800 gap-1">
            <button
              id="view-mode-bars-btn"
              onClick={() => setViewMode("bars")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "bars"
                  ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="バー表示"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              id="view-mode-grid-btn"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "grid"
                  ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="グリッド表示"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="view-mode-table-btn"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "table"
                  ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="テーブル表示"
            >
              <TableProperties className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && trends.length === 0 && (
        <div className="space-y-3 py-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 animate-pulse flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-800 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="w-1/3 h-4 bg-zinc-800 rounded"></div>
                <div className="w-2/3 h-3 bg-zinc-800/60 rounded"></div>
              </div>
              <div className="w-24 h-6 bg-zinc-800 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {!isLoading && processedTrends.length === 0 && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center text-zinc-400">
          <Filter className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-300">条件に一致するトレンドが見つかりませんでした。</p>
          <button
            onClick={() => {
              setSelectedGenre("all");
              setFilterText("");
            }}
            className="mt-3 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            フィルターをリセット
          </button>
        </div>
      )}

      {/* Mode 1: Bar & Volume List (Default glanceable view) */}
      {viewMode === "bars" && processedTrends.length > 0 && (
        <div id="trends-bar-view" className="space-y-2.5">
          <AnimatePresence>
            {processedTrends.map((trend) => {
              const barPercent = Math.min(
                100,
                Math.max(8, Math.round(((trend.tweetCount || 10) / maxTweetCount) * 100))
              );

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  key={`bar-${trend.rank}-${trend.query}`}
                  id={`trend-row-${trend.rank}`}
                  onClick={() => onSelectKeyword(trend.query)}
                  className="group relative bg-zinc-950 hover:bg-zinc-900/90 border border-zinc-900 hover:border-red-900/50 rounded-2xl p-3.5 transition-all shadow-md cursor-pointer overflow-hidden"
                >
                  {/* Background Progress Bar in Crimson Red */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-red-600/10 group-hover:bg-red-600/20 transition-all rounded-l-2xl pointer-events-none"
                    style={{ width: `${barPercent}%` }}
                  />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Rank, Query, Genre, ChildBuzz */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Rank badge */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${getRankBadge(
                          trend.rank
                        )}`}
                      >
                        {trend.rank}
                      </div>

                      {/* Keyword Title & Tags */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-white group-hover:text-red-400 text-sm sm:text-base transition-colors truncate">
                            {trend.query}
                          </h4>

                          {/* Rank diff indicator */}
                          {trend.rankUp === 1 ? (
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-red-600/20 text-red-400 font-bold border border-red-600/30 flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" />
                              {trend.rankDiff > 0 ? `+${trend.rankDiff.toFixed(1)}` : "急上昇"}
                            </span>
                          ) : trend.rankDiff > 0 ? (
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-red-950/40 text-red-300 font-bold flex items-center gap-0.5">
                              <ArrowUpRight className="w-3 h-3" />
                              {`+${trend.rankDiff.toFixed(1)}`}
                            </span>
                          ) : null}

                          {/* Genre tag */}
                          {trend.genre && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getGenreBadgeClass(
                                trend.genre
                              )}`}
                            >
                              {trend.genre}
                            </span>
                          )}
                        </div>

                        {/* Child Buzz tags */}
                        {trend.childBuzz && trend.childBuzz.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-zinc-500">関連:</span>
                            {trend.childBuzz.slice(0, 5).map((child, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectKeyword(child);
                                }}
                                className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-red-600/20 text-zinc-300 hover:text-red-400 border border-zinc-800 transition-colors"
                              >
                                {child}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Tweet Volume, Sentiment Ratio, Action buttons */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-900">
                      {/* Sentiment meter */}
                      {(trend.positive > 0 || trend.negative > 0) && (
                        <div className="flex flex-col items-end text-xs">
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 mb-0.5">
                            {trend.positive > 0 && (
                              <span className="text-zinc-300 flex items-center gap-0.5 font-mono">
                                <ThumbsUp className="w-2.5 h-2.5 text-red-400" />
                                {trend.positive}%
                              </span>
                            )}
                            {trend.negative > 0 && (
                              <span className="text-red-400 flex items-center gap-0.5 font-mono">
                                <ThumbsDown className="w-2.5 h-2.5" />
                                {trend.negative}%
                              </span>
                            )}
                          </div>
                          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
                            <div
                              className="bg-zinc-400 h-full"
                              style={{ width: `${trend.positive}%` }}
                            />
                            <div
                              className="bg-red-600 h-full"
                              style={{ width: `${trend.negative}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Tweet count volume pill */}
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-white flex items-center gap-1 justify-end">
                          <MessageCircle className="w-3.5 h-3.5 text-red-500" />
                          <span>{trend.tweetCount ? trend.tweetCount.toLocaleString() : "話題"}</span>
                          <span className="text-[10px] text-zinc-500 font-normal">posts</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Copy button */}
                        <button
                          id={`copy-trend-btn-${trend.rank}`}
                          onClick={(e) => handleCopy(e, trend.query)}
                          className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
                          title="キーワードをコピー"
                        >
                          {copiedKeyword === trend.query ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Open in X */}
                        <a
                          id={`x-trend-link-${trend.rank}`}
                          href={`https://x.com/search?q=${encodeURIComponent(trend.query)}&f=live`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
                          title="Xで検索結果を開く"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Quick View Button */}
                        <button
                          id={`inspect-trend-btn-${trend.rank}`}
                          onClick={() => onSelectKeyword(trend.query)}
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-md shadow-red-600/30"
                        >
                          <span>ポスト表示</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Mode 2: Card Grid View */}
      {viewMode === "grid" && processedTrends.length > 0 && (
        <div id="trends-grid-view" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {processedTrends.map((trend) => (
            <motion.div
              key={`grid-${trend.rank}-${trend.query}`}
              id={`trend-grid-card-${trend.rank}`}
              onClick={() => onSelectKeyword(trend.query)}
              className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-red-900/50 rounded-2xl p-4 transition-all shadow-md cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${getRankBadge(trend.rank)}`}>
                      {trend.rank}
                    </span>
                    {trend.genre && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getGenreBadgeClass(trend.genre)}`}>
                        {trend.genre}
                      </span>
                    )}
                  </div>
                  {trend.rankUp === 1 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 font-bold border border-red-600/30 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> 急上昇
                    </span>
                  )}
                </div>

                <h4 className="font-black text-white group-hover:text-red-400 text-base mb-2 transition-colors">
                  {trend.query}
                </h4>

                {trend.childBuzz && trend.childBuzz.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {trend.childBuzz.slice(0, 4).map((c, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-900 pt-3 flex items-center justify-between text-xs">
                <div className="font-mono text-zinc-300 font-bold flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-red-500" />
                  {trend.tweetCount ? `${trend.tweetCount.toLocaleString()} posts` : "急上昇"}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleCopy(e, trend.query)}
                    className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white"
                    title="コピー"
                  >
                    {copiedKeyword === trend.query ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <span className="text-red-500 font-bold group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Mode 3: Compact Table View */}
      {viewMode === "table" && processedTrends.length > 0 && (
        <div id="trends-table-view" className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/90 text-zinc-400 font-bold uppercase text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">順位</th>
                  <th className="py-3 px-3">キーワード</th>
                  <th className="py-3 px-3 w-28">ジャンル</th>
                  <th className="py-3 px-3 text-right w-28">ポスト数</th>
                  <th className="py-3 px-3 w-32">感情比率</th>
                  <th className="py-3 px-3 text-center w-20">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {processedTrends.map((trend) => (
                  <tr
                    key={`table-${trend.rank}-${trend.query}`}
                    onClick={() => onSelectKeyword(trend.query)}
                    className="hover:bg-zinc-900/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-bold">
                      <span className={`inline-block w-6 h-6 leading-6 rounded-md text-xs text-center ${getRankBadge(trend.rank)}`}>
                        {trend.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white hover:text-red-400">
                      <div className="flex items-center gap-2">
                        <span>{trend.query}</span>
                        {trend.rankUp === 1 && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-red-600/20 text-red-400 font-bold">
                            UP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {trend.genre && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getGenreBadgeClass(trend.genre)}`}>
                          {trend.genre}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {trend.tweetCount ? trend.tweetCount.toLocaleString() : "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      {(trend.positive > 0 || trend.negative > 0) ? (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-zinc-300 font-mono">{trend.positive}%</span>
                          <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden flex">
                            <div className="bg-zinc-400 h-full" style={{ width: `${trend.positive}%` }}></div>
                            <div className="bg-red-600 h-full" style={{ width: `${trend.negative}%` }}></div>
                          </div>
                          <span className="text-red-400 font-mono">{trend.negative}%</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={(e) => handleCopy(e, trend.query)}
                        className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        title="コピー"
                      >
                        {copiedKeyword === trend.query ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
