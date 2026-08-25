import React, { useState } from "react";
import {
  Flame,
  RefreshCw,
  Search,
  Clock,
  Radio,
  ExternalLink,
  Train,
  Sparkles,
  Video,
  Download,
} from "lucide-react";

interface NavbarProps {
  formattedTime: string;
  isLoading: boolean;
  onRefresh: () => void;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (sec: number) => void;
  countdown: number;
  onSearch: (keyword: string) => void;
  activeTab: "trends" | "buzz" | "trains";
  setActiveTab: (tab: "trends" | "buzz" | "trains") => void;
  totalDelaysCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  formattedTime,
  isLoading,
  onRefresh,
  autoRefreshInterval,
  setAutoRefreshInterval,
  countdown,
  onSearch,
  activeTab,
  setActiveTab,
  totalDelaysCount,
}) => {
  const [searchInput, setSearchInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-red-950/60 text-white shadow-xl shadow-red-950/20"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Branding: X (Red & Black) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Iconic X logo badge in Red & Black */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-red-700 to-black p-0.5 shadow-md shadow-red-600/30 flex items-center justify-center">
              <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="w-5 h-5 fill-red-500 hover:fill-white transition-colors"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-wider text-white flex items-center gap-1.5">
                  <span className="text-red-500 font-extrabold text-2xl">𝕏</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 font-bold border border-red-600/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                    リアルタイム
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                本物のXポスト・動画・画像をリアルタイム取得＆ダウンロード
              </p>
            </div>
          </div>

          {/* Quick search input in Red & Black style */}
          <form
            id="navbar-search-form"
            onSubmit={handleSubmit}
            className="flex-1 max-w-md hidden md:flex items-center relative"
          >
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="navbar-search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="X上の話題・キーワード・ユーザーを検索..."
                className="w-full pl-9 pr-20 py-2 text-sm bg-zinc-900/90 border border-zinc-800 focus:border-red-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600/30 transition-all shadow-inner"
              />
              <button
                id="navbar-search-submit-btn"
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-sm shadow-red-600/30 active:scale-95"
              >
                検索
              </button>
            </div>
          </form>

          {/* Right controls: Last Updated, Auto-refresh timer, Refresh Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Last update & Auto refresh info */}
            <div className="hidden lg:flex flex-col items-end text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>
                  更新: <strong className="text-zinc-200">{formattedTime || "取得中..."}</strong>
                </span>
              </div>
              {autoRefreshInterval > 0 && (
                <span className="text-[11px] text-zinc-500">
                  自動更新まで <strong className="text-red-400 font-mono">{countdown}秒</strong>
                </span>
              )}
            </div>

            {/* Auto refresh select dropdown */}
            <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-800 text-xs">
              <Radio className="w-3.5 h-3.5 ml-1.5 text-red-500" />
              <select
                id="auto-refresh-select"
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-zinc-200 py-1 px-1.5 focus:outline-none cursor-pointer text-xs"
                title="自動更新間隔"
              >
                <option value={0} className="bg-zinc-900 text-white">自動更新: OFF</option>
                <option value={15} className="bg-zinc-900 text-white">15秒ごと</option>
                <option value={30} className="bg-zinc-900 text-white">30秒ごと</option>
                <option value={60} className="bg-zinc-900 text-white">60秒ごと</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
            <button
              id="manual-refresh-button"
              onClick={onRefresh}
              disabled={isLoading}
              className={`px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5 text-xs font-bold ${
                isLoading ? "opacity-75 cursor-not-allowed" : "active:scale-95"
              }`}
              title="今すぐ最新データを取得"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">更新</span>
            </button>

            {/* Link to X */}
            <a
              id="external-x-link"
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-red-900/40 transition-colors hidden sm:flex items-center gap-1 text-xs"
              title="X（Twitter）を開く"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-t border-red-950/40 pt-2 pb-2 gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5">
            <button
              id="tab-trends-btn"
              onClick={() => setActiveTab("trends")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "trends"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>トレンドランキング (1〜20位)</span>
            </button>

            <button
              id="tab-buzz-btn"
              onClick={() => setActiveTab("buzz")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "buzz"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>話題のバズ投稿＆メディア</span>
            </button>

            <button
              id="tab-trains-btn"
              onClick={() => setActiveTab("trains")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "trains"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80"
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              <span>鉄道遅延・運行状況</span>
              {totalDelaysCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-black font-black">
                  {totalDelaysCount}件
                </span>
              )}
            </button>
          </div>

          {/* Mobile search bar */}
          <form
            id="mobile-search-form"
            onSubmit={handleSubmit}
            className="flex md:hidden items-center relative w-44"
          >
            <input
              id="mobile-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="検索..."
              className="w-full pl-7 pr-2 py-1 text-xs bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
          </form>
        </div>
      </div>
    </header>
  );
};
