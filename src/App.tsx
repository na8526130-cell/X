import React, { useState, useEffect, useCallback } from "react";
import { RealtimeTrendsResponse, VideoPlayerTarget, ImagePreviewTarget } from "./types";
import { Navbar } from "./components/Navbar";
import { StatsBar } from "./components/StatsBar";
import { HotBuzzPills } from "./components/HotBuzzPills";
import { TrendList } from "./components/TrendList";
import { PopularTweetsView } from "./components/PopularTweetsView";
import { RailwayDelayView } from "./components/RailwayDelayView";
import { TweetDetailModal } from "./components/TweetDetailModal";
import { GoogleVideoPlayer } from "./components/GoogleVideoPlayer";
import { ImageModal } from "./components/ImageModal";
import { AlertCircle, RefreshCw, Flame, Sparkles, Train } from "lucide-react";

export default function App() {
  const [trendsData, setTrendsData] = useState<RealtimeTrendsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // 30s default
  const [countdown, setCountdown] = useState<number>(30);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trends" | "buzz" | "trains">("trends");

  // Video & Image Modals
  const [activeVideo, setActiveVideo] = useState<VideoPlayerTarget | null>(null);
  const [activeImage, setActiveImage] = useState<ImagePreviewTarget | null>(null);

  // Fetch real-time trends from API
  const fetchTrends = useCallback(async (isFresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = isFresh ? "/api/realtime/trends?fresh=true" : "/api/realtime/trends";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: RealtimeTrendsResponse = await res.json();
      if (json.success) {
        setTrendsData(json);
      } else {
        setError(json.error || "データの取得に失敗しました");
      }
    } catch (err: any) {
      console.error("Failed to fetch trends:", err);
      setError(err.message || "リアルタイムデータの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTrends(true);
  }, [fetchTrends]);

  // Auto-refresh timer logic
  useEffect(() => {
    if (autoRefreshInterval <= 0) {
      setCountdown(0);
      return;
    }

    setCountdown(autoRefreshInterval);
    const intervalTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchTrends(true);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [autoRefreshInterval, fetchTrends]);

  // Total rail delays count
  const areaItems = trendsData?.railwayDelays?.areaItems || {};
  const totalDelaysCount = Object.keys(areaItems).reduce(
    (acc, key) => acc + (areaItems[key]?.length || 0),
    0
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Navigation in Red & Black */}
      <Navbar
        formattedTime={trendsData?.formattedTime || ""}
        isLoading={isLoading}
        onRefresh={() => fetchTrends(true)}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
        countdown={countdown}
        onSearch={(kw) => setSelectedKeyword(kw)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalDelaysCount={totalDelaysCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-4 mb-6 text-red-300 text-sm flex items-center justify-between gap-4 shadow-lg shadow-red-950/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="font-bold">リアルタイム情報の取得エラー</p>
                <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => fetchTrends(true)}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/30 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 再試行
            </button>
          </div>
        )}

        {/* Real-time Summary Stats Bar */}
        {trendsData && trendsData.trends.length > 0 && (
          <StatsBar
            trends={trendsData.trends}
            totalDelaysCount={totalDelaysCount}
            onSelectKeyword={(kw) => setSelectedKeyword(kw)}
            onOpenTrains={() => setActiveTab("trains")}
          />
        )}

        {/* Hot Buzz Quick Pills */}
        {trendsData?.hotBuzz && trendsData.hotBuzz.length > 0 && (
          <HotBuzzPills
            items={trendsData.hotBuzz}
            onSelectKeyword={(kw) => setSelectedKeyword(kw)}
          />
        )}

        {/* Tab 1: Trend Ranking List */}
        {activeTab === "trends" && (
          <section id="section-trends">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30">
                  <Flame className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  リアルタイム トレンドランキング
                </h2>
                <span className="text-xs text-zinc-400 hidden sm:inline">
                  （上位20件・話題度メーター・感情分析）
                </span>
              </div>

              <div className="text-xs text-red-400 font-semibold">
                クリックで本物のXポストを表示・検索
              </div>
            </div>

            <TrendList
              trends={trendsData?.trends || []}
              onSelectKeyword={(kw) => setSelectedKeyword(kw)}
              isLoading={isLoading}
            />
          </section>
        )}

        {/* Tab 2: Popular Buzz Tweets (70 items with Google Video Player & Media Downloads) */}
        {activeTab === "buzz" && (
          <section id="section-buzz">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30">
                  <Sparkles className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  話題のバズ投稿＆動画・画像メディア
                </h2>
              </div>
              <span className="text-xs text-zinc-400 hidden sm:inline">
                動画はGoogle Video再生、画像＆動画は1クリックで直接保存・DL可能
              </span>
            </div>

            <PopularTweetsView
              tweets={trendsData?.popularTweets || []}
              onSelectKeyword={(kw) => setSelectedKeyword(kw)}
              onPlayVideo={(v) => setActiveVideo(v)}
              onPreviewImage={(img) => setActiveImage(img)}
            />
          </section>
        )}

        {/* Tab 3: Railway Delays & Train status */}
        {activeTab === "trains" && (
          <section id="section-trains">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30">
                  <Train className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  リアルタイム 鉄道遅延・運行状況
                </h2>
              </div>
            </div>

            <RailwayDelayView
              delayData={trendsData?.railwayDelays || { tabItems: [], areaItems: {} }}
              onSelectKeyword={(kw) => setSelectedKeyword(kw)}
            />
          </section>
        )}
      </main>

      {/* Footer in Red and Black theme */}
      <footer className="border-t border-red-950/60 bg-black/95 py-6 text-center text-xs text-zinc-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1">
              <span className="text-red-500 font-extrabold text-sm">𝕏</span> リアルタイム検索
            </span>
            <span>•</span>
            <span className="text-zinc-400">本物のXデータ取得＆Google Video再生</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <a
              href="https://search.yahoo.co.jp/realtime"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-400 transition-colors"
            >
              Yahoo!リアルタイム検索
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-400 transition-colors"
            >
              𝕏 (Twitter) 公式
            </a>
          </div>
        </div>
      </footer>

      {/* Google Video Player Modal */}
      {activeVideo && (
        <GoogleVideoPlayer
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}

      {/* Image Preview & Download Modal */}
      {activeImage && (
        <ImageModal
          image={activeImage}
          onClose={() => setActiveImage(null)}
        />
      )}

      {/* Live Tweet Stream Modal */}
      {selectedKeyword && (
        <TweetDetailModal
          keyword={selectedKeyword}
          onClose={() => setSelectedKeyword(null)}
          onSelectKeyword={(kw) => setSelectedKeyword(kw)}
          onPlayVideo={(v) => setActiveVideo(v)}
          onPreviewImage={(img) => setActiveImage(img)}
        />
      )}
    </div>
  );
}
