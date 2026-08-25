import React, { useState, useMemo, useEffect, useRef } from "react";
import { PopularTweet, VideoPlayerTarget, ImagePreviewTarget } from "../types";
import {
  Heart,
  Repeat,
  MessageSquare,
  ExternalLink,
  ImageIcon,
  Video,
  Search,
  Download,
  Play,
  Share2,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PopularTweetsViewProps {
  tweets: PopularTweet[];
  onSelectKeyword?: (keyword: string) => void;
  onPlayVideo: (video: VideoPlayerTarget) => void;
  onPreviewImage: (image: ImagePreviewTarget) => void;
}

export const PopularTweetsView: React.FC<PopularTweetsViewProps> = ({
  tweets,
  onSelectKeyword,
  onPlayVideo,
  onPreviewImage,
}) => {
  const [filterType, setFilterType] = useState<"all" | "photo" | "video" | "text">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(18);
  const [infiniteScroll, setInfiniteScroll] = useState<boolean>(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredTweets = useMemo(() => {
    let list = [...tweets];
    if (filterType === "photo") {
      list = list.filter((t) => t.mediaType === "photo" || (t.imageUrl && t.mediaType !== "video"));
    } else if (filterType === "video") {
      list = list.filter((t) => t.mediaType === "video");
    } else if (filterType === "text") {
      list = list.filter((t) => !t.imageUrl && !t.mediaType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.body.toLowerCase().includes(q));
    }

    return list;
  }, [tweets, filterType, searchQuery]);

  const displayedTweets = useMemo(() => {
    return filteredTweets.slice(0, visibleCount);
  }, [filteredTweets, visibleCount]);

  const hasMore = visibleCount < filteredTweets.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 18, filteredTweets.length));
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!infiniteScroll || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "300px" }
    );

    const target = sentinelRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [infiniteScroll, hasMore, filteredTweets.length]);

  // Handle direct download of tweet media
  const handleDownloadMedia = async (e: React.MouseEvent, tweet: PopularTweet) => {
    e.stopPropagation();
    if (!tweet.imageUrl && !tweet.tweetId) return;

    setDownloadingId(tweet.tweetId || tweet.url);

    try {
      if (tweet.mediaType === "video") {
        const res = await fetch(`/api/realtime/tweet-detail?id=${tweet.tweetId}`);
        const json = await res.json();
        const videoMedia = json.tweet?.media?.find((m: any) => m.type === "video");
        const videoUrl = videoMedia?.mediaUrl || tweet.imageUrl;

        const filename = `x-video-${tweet.tweetId || Date.now()}.mp4`;
        const downloadUrl = `/api/proxy/download?url=${encodeURIComponent(
          videoUrl
        )}&filename=${encodeURIComponent(filename)}`;

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (tweet.imageUrl) {
        const filename = `x-image-${tweet.tweetId || Date.now()}.jpg`;
        const downloadUrl = `/api/proxy/download?url=${encodeURIComponent(
          tweet.imageUrl
        )}&filename=${encodeURIComponent(filename)}`;

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Direct download failed:", err);
    } finally {
      setTimeout(() => setDownloadingId(null), 1500);
    }
  };

  // Handle playing video with Google Video Player
  const handlePlayClick = (e: React.MouseEvent, tweet: PopularTweet) => {
    e.stopPropagation();

    // Instantly open player modal so user receives zero-latency response
    onPlayVideo({
      url: tweet.imageUrl || tweet.url,
      title: tweet.body.slice(0, 80),
      poster: tweet.imageUrl,
      tweetId: tweet.tweetId,
      tweetUrl: tweet.tweetId ? `https://x.com/i/status/${tweet.tweetId}` : tweet.url,
      videoType: "hls",
    });
  };

  if (!tweets || tweets.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-12 text-center text-zinc-400">
        <p>話題のポストデータを取得中またはデータがありません。</p>
      </div>
    );
  }

  return (
    <div id="popular-tweets-view" className="space-y-4">
      {/* Filter and search header in Red & Black */}
      <div className="bg-zinc-950/90 border border-zinc-900 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            id="pop-filter-all"
            onClick={() => {
              setFilterType("all");
              setVisibleCount(18);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterType === "all"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            すべて ({tweets.length})
          </button>
          <button
            id="pop-filter-video"
            onClick={() => {
              setFilterType("video");
              setVisibleCount(18);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              filterType === "video"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Video className="w-3.5 h-3.5 text-red-400" />
            <span>動画付き (Google Video)</span>
          </button>
          <button
            id="pop-filter-photo"
            onClick={() => {
              setFilterType("photo");
              setVisibleCount(18);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              filterType === "photo"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-red-400" />
            <span>画像付き</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            id="search-pop-tweets"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ポスト本文内を検索..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of viral buzz tweets in Red & Black theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedTweets.map((tweet, idx) => {
          const directUrl = tweet.tweetId
            ? `https://x.com/i/status/${tweet.tweetId}`
            : tweet.url;

          const isVideo = tweet.mediaType === "video";
          const isPhoto = tweet.mediaType === "photo" || (!isVideo && !!tweet.imageUrl);
          const isDl = downloadingId === (tweet.tweetId || tweet.url);

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              key={`poptw-${tweet.tweetId || idx}`}
              id={`popular-tweet-card-${idx}`}
              className="bg-zinc-950/90 border border-zinc-900 hover:border-red-600/40 rounded-2xl p-4 transition-all shadow-md hover:shadow-xl hover:shadow-red-950/20 flex flex-col justify-between group"
            >
              <div>
                {/* Media Thumbnail Container with Video Play & Image Download Overlays */}
                {tweet.imageUrl && (
                  <div className="relative mb-3 rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800 group/media">
                    <img
                      src={tweet.imageUrl}
                      alt="Tweet attachment"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      loading="lazy"
                      onClick={(e) => {
                        if (isVideo) {
                          handlePlayClick(e, tweet);
                        } else {
                          onPreviewImage({
                            url: tweet.imageUrl!,
                            title: tweet.body.slice(0, 60),
                            tweetUrl: directUrl,
                            filename: `x-image-${tweet.tweetId || idx}.jpg`,
                          });
                        }
                      }}
                    />

                    {/* Video Play Badge & Button (Google Video) */}
                    {isVideo && (
                      <button
                        onClick={(e) => handlePlayClick(e, tweet)}
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

                    {/* Image Inspect Badge */}
                    {isPhoto && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-red-400" /> 画像
                      </div>
                    )}

                    {/* Quick Media Download Button */}
                    <button
                      onClick={(e) => handleDownloadMedia(e, tweet)}
                      disabled={isDl}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-zinc-200 hover:text-white backdrop-blur-sm transition-all border border-zinc-700 shadow-md"
                      title={isVideo ? "動画をダウンロード" : "画像をダウンロード"}
                    >
                      <Download
                        className={`w-3.5 h-3.5 ${isDl ? "animate-bounce" : ""}`}
                      />
                    </button>
                  </div>
                )}

                {/* Tweet Body */}
                <p className="text-xs sm:text-sm text-zinc-200 line-clamp-4 leading-relaxed mb-3 select-text">
                  {tweet.body}
                </p>
              </div>

              <div>
                {/* Metrics & Action Links */}
                <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-3">
                    {/* Likes */}
                    {tweet.like !== undefined && tweet.like > 0 && (
                      <span className="flex items-center gap-1 text-red-400 font-mono font-bold">
                        <Heart className="w-3.5 h-3.5 fill-red-500/20" />
                        {tweet.like.toLocaleString()}
                      </span>
                    )}
                    {/* Retweets */}
                    {tweet.rt !== undefined && tweet.rt > 0 && (
                      <span className="flex items-center gap-1 text-zinc-300 font-mono">
                        <Repeat className="w-3.5 h-3.5 text-red-500" />
                        {tweet.rt.toLocaleString()}
                      </span>
                    )}
                    {/* Time */}
                    {tweet.time && (
                      <span className="text-[11px] text-zinc-500">
                        {tweet.time}
                      </span>
                    )}
                  </div>

                  {/* Actions: Download & Open in X */}
                  <div className="flex items-center gap-1.5">
                    {/* Download Button */}
                    {(tweet.imageUrl || isVideo) && (
                      <button
                        onClick={(e) => handleDownloadMedia(e, tweet)}
                        disabled={isDl}
                        className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-red-600 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="メディアをダウンロード"
                      >
                        <Download
                          className={`w-3 h-3 ${isDl ? "animate-bounce" : ""}`}
                        />
                        <span>{isDl ? "DL中..." : "保存"}</span>
                      </button>
                    )}

                    {/* Direct Link to X */}
                    <a
                      id={`open-pop-tweet-${idx}`}
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="X（Twitter）で投稿を開く"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Load More & Infinite Scroll Controls */}
      {filteredTweets.length > 0 && (
        <div className="pt-6 pb-4 flex flex-col items-center justify-center gap-3">
          <div ref={sentinelRef} className="h-1 w-full" />

          {hasMore ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                id="pop-load-more-btn"
                onClick={handleLoadMore}
                className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-600 border border-zinc-800 hover:border-red-600 text-zinc-200 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <ChevronDown className="w-4 h-4" />
                <span>さらに表示する (+18件)</span>
              </button>

              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer bg-zinc-900/60 px-3 py-2 rounded-xl border border-zinc-800">
                <input
                  type="checkbox"
                  checked={infiniteScroll}
                  onChange={(e) => setInfiniteScroll(e.target.checked)}
                  className="accent-red-600 rounded"
                />
                <span>スクロールで自動追加</span>
              </label>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 font-medium">
              すべての話題のポスト ({filteredTweets.length} 件) を表示中
            </p>
          )}

          <p className="text-[11px] text-zinc-600 font-mono">
            {displayedTweets.length} / {filteredTweets.length} 件を表示中
          </p>
        </div>
      )}
    </div>
  );
};
