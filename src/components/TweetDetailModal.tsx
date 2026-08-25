import React, { useEffect, useState, useCallback, useRef } from "react";
import { KeywordSearchResponse, TimelineTweet, VideoPlayerTarget, ImagePreviewTarget } from "../types";
import {
  X,
  RefreshCw,
  ExternalLink,
  Heart,
  Repeat,
  MessageSquare,
  Search,
  Hash,
  AlertCircle,
  Copy,
  Check,
  User,
  Sparkles,
  Download,
  Play,
  ImageIcon,
  Video,
  Radio,
  ArrowUp,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Flame,
  Clock,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TweetDetailModalProps {
  keyword: string | null;
  onClose: () => void;
  onSelectKeyword: (kw: string) => void;
  onPlayVideo: (video: VideoPlayerTarget) => void;
  onPreviewImage: (image: ImagePreviewTarget) => void;
}

export const TweetDetailModal: React.FC<TweetDetailModalProps> = ({
  keyword,
  onClose,
  onSelectKeyword,
  onPlayVideo,
  onPreviewImage,
}) => {
  const [tweets, setTweets] = useState<TimelineTweet[]>([]);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [relatedHashtags, setRelatedHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customKeywordInput, setCustomKeywordInput] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filters & Sort Modes
  const [sortMode, setSortMode] = useState<"t" | "h" | "all">("t"); // 't'=latest, 'h'=hot/buzz, 'all'=combined
  const [mediaFilter, setMediaFilter] = useState<"all" | "video" | "image" | "text">("all");
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState(true);

  // Live New Tweets Polling
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [pendingNewTweets, setPendingNewTweets] = useState<TimelineTweet[]>([]);
  const [autoStreamMode, setAutoStreamMode] = useState(false); // If true, auto-prepend without clicking

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestIdRef = useRef<string>("");

  // Fetch initial tweets
  const fetchInitialTweets = useCallback(
    async (query: string, mode: "t" | "h" | "all" = "t") => {
      if (!query) return;
      setIsLoading(true);
      setError(null);
      setPendingNewTweets([]);

      try {
        const res = await fetch(
          `/api/realtime/search?p=${encodeURIComponent(query)}&md=${mode}`
        );
        const json: KeywordSearchResponse = await res.json();
        if (json.success) {
          const list = json.tweets || [];
          setTweets(list);
          setTotalResults(json.totalResultsAvailable || list.length);
          setRelatedHashtags(json.relatedHashtags || []);
          if (list.length > 0) {
            latestIdRef.current = list[0].id;
          }
        } else {
          setError(json.error || "ツイートの取得に失敗しました");
        }
      } catch (err: any) {
        setError(err.message || "ネットワークエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load more tweets (appends complementary mode or deeper query)
  const handleLoadMore = useCallback(async () => {
    if (!keyword || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);

    try {
      // Fetch both latest and hot to collect as many unique tweets as possible
      const targetMode = sortMode === "t" ? "all" : sortMode === "h" ? "all" : "t";
      const res = await fetch(
        `/api/realtime/search?p=${encodeURIComponent(keyword)}&md=${targetMode}`
      );
      const json: KeywordSearchResponse = await res.json();
      if (json.success && json.tweets) {
        setTweets((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newEntries = json.tweets.filter((t) => !existingIds.has(t.id));
          return [...prev, ...newEntries];
        });
      }
    } catch (err) {
      console.error("Failed to load more tweets:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [keyword, sortMode, isLoadingMore, isLoading]);

  // Initial fetch when keyword or sortMode changes
  useEffect(() => {
    if (keyword) {
      setCustomKeywordInput(keyword);
      fetchInitialTweets(keyword, sortMode);
    }
  }, [keyword, sortMode, fetchInitialTweets]);

  // Background polling for new live tweets
  useEffect(() => {
    if (!keyword || !isLiveActive) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const pollForNew = async () => {
      if (!keyword) return;
      try {
        // Poll for latest
        const res = await fetch(
          `/api/realtime/search?p=${encodeURIComponent(keyword)}&md=t`
        );
        const json: KeywordSearchResponse = await res.json();
        if (json.success && json.tweets && json.tweets.length > 0) {
          setTweets((currentTweets) => {
            const currentIds = new Set(currentTweets.map((t) => t.id));
            const fresh = json.tweets.filter((t) => !currentIds.has(t.id));

            if (fresh.length > 0) {
              if (autoStreamMode) {
                // Prepend automatically in stream mode
                return [...fresh, ...currentTweets];
              } else {
                // Queue into pending new tweets for X-style bar
                setPendingNewTweets((prev) => {
                  const prevIds = new Set(prev.map((p) => p.id));
                  const strictlyNew = fresh.filter((f) => !prevIds.has(f.id));
                  return [...strictlyNew, ...prev];
                });
              }
            }
            return currentTweets;
          });
        }
      } catch (err) {
        // Silently ignore background polling errors
      }
    };

    pollTimerRef.current = setInterval(pollForNew, 7000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [keyword, isLiveActive, autoStreamMode]);

  // Infinite scroll intersection observer
  useEffect(() => {
    if (!infiniteScrollEnabled || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { root: scrollContainerRef.current, rootMargin: "250px" }
    );

    const target = bottomSentinelRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [infiniteScrollEnabled, handleLoadMore, isLoading, isLoadingMore]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!keyword) return null;

  // Insert pending new tweets
  const handleApplyPendingNewTweets = () => {
    if (pendingNewTweets.length === 0) return;
    setTweets((prev) => {
      const prevIds = new Set(prev.map((t) => t.id));
      const fresh = pendingNewTweets.filter((t) => !prevIds.has(t.id));
      return [...fresh, ...prev];
    });
    setPendingNewTweets([]);

    // Scroll to top smoothly
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(keyword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleNewSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (customKeywordInput.trim() && customKeywordInput !== keyword) {
      onSelectKeyword(customKeywordInput.trim());
    } else if (customKeywordInput.trim()) {
      fetchInitialTweets(customKeywordInput.trim(), sortMode);
    }
  };

  const handleDownloadMedia = async (mediaUrl: string, tweetId: string, type: string) => {
    setDownloadingId(mediaUrl);
    try {
      const ext = type === "video" ? "mp4" : "jpg";
      const filename = `x-${type}-${tweetId || Date.now()}.${ext}`;
      const downloadUrl = `/api/proxy/download?url=${encodeURIComponent(
        mediaUrl
      )}&filename=${encodeURIComponent(filename)}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setTimeout(() => setDownloadingId(null), 1500);
    }
  };

  // Filter tweets based on media filter
  const displayedTweets = tweets.filter((t) => {
    if (mediaFilter === "video") {
      return t.media && t.media.some((m) => m.type === "video" || m.mediaUrl.includes(".m3u8"));
    }
    if (mediaFilter === "image") {
      return (
        t.media &&
        t.media.some((m) => m.type !== "video" && !m.mediaUrl.includes(".m3u8"))
      );
    }
    if (mediaFilter === "text") {
      return !t.media || t.media.length === 0;
    }
    return true;
  });

  const xSearchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&f=live`;

  return (
    <div
      id="tweet-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        id="tweet-modal-content"
        className="bg-zinc-950 border border-red-950/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl shadow-red-950/40 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header in Red & Black */}
        <div className="p-4 sm:p-5 border-b border-zinc-900 bg-black/95 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30">
                <Sparkles className="w-5 h-5 text-red-500" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white truncate">
                    {keyword}
                  </h2>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    title="キーワードをコピー"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                  <span className="text-red-400 font-bold">𝕏 リアルタイム検索</span>
                  <span className="font-mono text-zinc-300">
                    （{displayedTweets.length} 件表示中
                    {totalResults ? ` / 全約${totalResults.toLocaleString()}件` : ""}）
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Live Status Badge */}
              <button
                id="modal-live-toggle"
                onClick={() => setIsLiveActive(!isLiveActive)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                  isLiveActive
                    ? "bg-red-950/60 text-red-400 border-red-800/80 shadow-md shadow-red-900/30"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}
                title={isLiveActive ? "リアルタイム更新中 (クリックで一時停止)" : "一時停止中 (クリックで再開)"}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveActive ? "bg-red-500 animate-ping" : "bg-zinc-600"
                  }`}
                />
                <span>{isLiveActive ? "LIVE ON" : "PAUSED"}</span>
              </button>

              <button
                id="refresh-modal-tweets-btn"
                onClick={() => fetchInitialTweets(keyword, sortMode)}
                disabled={isLoading}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
                title="タイムラインを再取得"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin text-red-400" : ""}`}
                />
              </button>

              <a
                id="modal-x-url"
                href={xSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-md shadow-red-600/30 hidden sm:flex"
                title="Xで直接開く"
              >
                <span>𝕏 で開く</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                id="close-tweet-modal-btn"
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-red-600 text-zinc-400 hover:text-white transition-colors ml-1 border border-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Inline Search / Switch Keyword */}
          <form onSubmit={handleNewSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={customKeywordInput}
                onChange={(e) => setCustomKeywordInput(e.target.value)}
                placeholder="別のキーワードで再検索..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-md shadow-red-600/20"
            >
              検索
            </button>
          </form>

          {/* Filter & Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-900">
            {/* Sort options */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-zinc-500 mr-1 hidden sm:inline">並び順:</span>
              <button
                onClick={() => setSortMode("t")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  sortMode === "t"
                    ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Clock className="w-3 h-3" /> 最新順
              </button>
              <button
                onClick={() => setSortMode("h")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  sortMode === "h"
                    ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Flame className="w-3 h-3" /> 話題・バズ順
              </button>
              <button
                onClick={() => setSortMode("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  sortMode === "all"
                    ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Layers className="w-3 h-3" /> すべて結合
              </button>
            </div>

            {/* Media Filter */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setMediaFilter("all")}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  mediaFilter === "all"
                    ? "bg-zinc-800 text-white font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                全メディア
              </button>
              <button
                onClick={() => setMediaFilter("video")}
                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                  mediaFilter === "video"
                    ? "bg-red-950 text-red-300 border border-red-800 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Video className="w-3 h-3 text-red-500" /> 動画のみ
              </button>
              <button
                onClick={() => setMediaFilter("image")}
                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                  mediaFilter === "image"
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <ImageIcon className="w-3 h-3 text-red-400" /> 画像のみ
              </button>
            </div>
          </div>

          {/* Related hashtags */}
          {relatedHashtags && relatedHashtags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-zinc-500 flex items-center gap-0.5">
                <Hash className="w-3 h-3 text-red-500" /> 関連ハッシュタグ:
              </span>
              {relatedHashtags.slice(0, 6).map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectKeyword(tag.replace(/^#/, ""))}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-red-600/20 text-zinc-300 hover:text-red-400 border border-zinc-800 hover:border-red-600/40 transition-colors"
                >
                  #{tag.replace(/^#/, "")}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Floating X-style Live New Tweets Bar */}
        <AnimatePresence>
          {pendingNewTweets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.25, type: "spring", stiffness: 300 }}
              className="absolute top-44 sm:top-48 left-0 right-0 z-30 flex justify-center pointer-events-none px-4"
            >
              <button
                id="live-new-tweets-bar"
                onClick={handleApplyPendingNewTweets}
                className="pointer-events-auto px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-black shadow-xl shadow-red-600/50 border border-red-400 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer animate-bounce"
              >
                <ArrowUp className="w-4 h-4 text-white animate-pulse" />
                <span>↑ 新着 {pendingNewTweets.length} 件のポストを表示</span>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Body / Tweet Stream */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 relative scroll-smooth"
        >
          {isLoading && tweets.length === 0 && (
            <div className="space-y-4 py-8">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 animate-pulse space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800"></div>
                    <div className="space-y-1.5 flex-1">
                      <div className="w-28 h-3.5 bg-zinc-800 rounded"></div>
                      <div className="w-20 h-2.5 bg-zinc-800/60 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full h-3 bg-zinc-800/80 rounded"></div>
                    <div className="w-4/5 h-3 bg-zinc-800/80 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-4 text-red-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="font-bold">データの取得エラー</p>
                <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && displayedTweets.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
              <p className="font-bold text-zinc-300">該当するポストが見つかりませんでした。</p>
              <p className="text-xs text-zinc-500 mt-1">
                別のキーワードやフィルターで検索するか、時間をおいて再試行してください。
              </p>
            </div>
          )}

          {displayedTweets.map((tweet: TimelineTweet, idx: number) => {
            const tweetDirectUrl =
              tweet.url || (tweet.id ? `https://x.com/i/status/${tweet.id}` : "");

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={`modal-tweet-${tweet.id || idx}`}
                id={`stream-tweet-${idx}`}
                className="bg-zinc-950 border border-zinc-900 hover:border-red-900/40 rounded-2xl p-4 transition-all shadow-md space-y-3 group"
              >
                {/* User info & Timestamp */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {tweet.profileImage ? (
                      <img
                        src={tweet.profileImage}
                        alt={tweet.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover bg-zinc-800 shrink-0 border border-zinc-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                        <span>{tweet.name || "ユーザー"}</span>
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        @{tweet.screenName || "user"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {tweet.formattedTime && (
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {tweet.formattedTime}
                      </span>
                    )}
                    {tweetDirectUrl && (
                      <a
                        href={tweetDirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
                        title="Xでポストを開く"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Post text */}
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {tweet.displayText || tweet.displayTextBody}
                </p>

                {/* Media attachments with Google Video Player & Download triggers */}
                {tweet.media && tweet.media.length > 0 && (
                  <div
                    className={`grid gap-2 rounded-xl overflow-hidden ${
                      tweet.media.length === 1
                        ? "grid-cols-1 max-h-80"
                        : tweet.media.length === 2
                        ? "grid-cols-2 max-h-64"
                        : "grid-cols-2 max-h-72"
                    }`}
                  >
                    {tweet.media.map((m, mIdx) => {
                      const isYouTube = m.type === "youTube" || m.mediaUrl.includes("youtu");
                      const isVideo = m.type === "video" || isYouTube || m.mediaUrl.includes(".m3u8") || m.mediaUrl.includes(".mp4");
                      const isDl = downloadingId === m.mediaUrl;

                      const handleTriggerPlay = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        onPlayVideo({
                          url: m.mediaUrl,
                          title: tweet.displayText.slice(0, 60),
                          authorName: tweet.name,
                          authorHandle: tweet.screenName,
                          poster: m.thumbnailUrl || m.mediaUrl,
                          tweetId: tweet.id,
                          tweetUrl: tweetDirectUrl,
                          videoType: isYouTube ? "youtube" : m.mediaUrl.includes(".m3u8") ? "hls" : "mp4",
                        });
                      };

                      return (
                        <div
                          key={mIdx}
                          className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center max-h-64 border border-zinc-800 group/item"
                        >
                          <img
                            src={m.thumbnailUrl || m.mediaUrl}
                            alt="Attachment"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onClick={(e) => {
                              if (isVideo) {
                                handleTriggerPlay(e);
                              } else {
                                onPreviewImage({
                                  url: m.mediaUrl,
                                  title: tweet.displayText.slice(0, 60),
                                  authorName: tweet.name,
                                  tweetUrl: tweetDirectUrl,
                                  filename: `x-image-${tweet.id}-${mIdx}.jpg`,
                                });
                              }
                            }}
                          />

                          {/* Play Video button (Google Video) */}
                          {isVideo && (
                            <button
                              onClick={handleTriggerPlay}
                              className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-colors group/play"
                              title="Google Video で再生"
                            >
                              <div className="w-12 h-12 rounded-full bg-red-600/90 group-hover/play:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transform group-hover/play:scale-110 transition-transform">
                                <Play className="w-6 h-6 fill-current ml-0.5" />
                              </div>
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-bold text-red-400 border border-red-900/50 flex items-center gap-1">
                                <Video className="w-3 h-3 text-red-500" /> Google Video
                              </span>
                            </button>
                          )}

                          {/* Download overlay button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadMedia(m.mediaUrl, tweet.id, m.type || "image");
                            }}
                            disabled={isDl}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-zinc-200 hover:text-white backdrop-blur-sm transition-all border border-zinc-700 shadow-md"
                            title="ダウンロードして保存"
                          >
                            <Download
                              className={`w-3.5 h-3.5 ${isDl ? "animate-bounce" : ""}`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer Stats: Likes, RT, Replies */}
                <div className="pt-2 border-t border-zinc-900 flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1 font-mono font-bold text-red-400">
                    <Heart className="w-3.5 h-3.5 fill-red-500/20" />
                    {tweet.likesCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-zinc-300">
                    <Repeat className="w-3.5 h-3.5 text-red-500" />
                    {tweet.rtCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-zinc-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {tweet.replyCount.toLocaleString()}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Bottom Load More & Infinite Scroll Sentinel */}
          {displayedTweets.length > 0 && (
            <div className="pt-4 pb-6 flex flex-col items-center justify-center gap-3">
              <div ref={bottomSentinelRef} className="h-1 w-full" />

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  id="modal-load-more-btn"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-600 border border-zinc-800 hover:border-red-600 text-zinc-200 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingMore ? "animate-spin text-red-400" : ""}`} />
                  <span>{isLoadingMore ? "過去の投稿を読み込み中..." : "さらに読み込む（もっと見る）"}</span>
                </button>

                {/* Infinite Scroll Toggle */}
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer bg-zinc-900/60 px-3 py-2 rounded-xl border border-zinc-800">
                  <input
                    type="checkbox"
                    checked={infiniteScrollEnabled}
                    onChange={(e) => setInfiniteScrollEnabled(e.target.checked)}
                    className="accent-red-600 rounded"
                  />
                  <span>スクロールで自動追加 (無限スクロール)</span>
                </label>
              </div>

              <p className="text-[11px] text-zinc-500 font-mono">
                現在 {displayedTweets.length} 件のポストを表示中
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
