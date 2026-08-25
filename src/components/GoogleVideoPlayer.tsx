import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  ExternalLink,
  X,
  Sliders,
  Tv,
  Check,
  Video as VideoIcon,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  GraduationCap,
  FileSpreadsheet,
} from "lucide-react";
import { VideoPlayerTarget } from "../types";

interface GoogleVideoPlayerProps {
  video: VideoPlayerTarget;
  onClose: () => void;
}

const SPREADSHEET_ID = "1dily2wiik92TAyK3zyIsu8TDuyYNoF20IM1iMk_X-pg";
const DEFAULT_EDU_PARAM =
  "?autoplay=1&mute=0&controls=1&start=0&origin=https%3A%2F%2Fcreate.kahoot.it&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&fs=1&cc_load_policy=0&enablejsapi=1";

export const GoogleVideoPlayer: React.FC<GoogleVideoPlayerProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [currentVideo, setCurrentVideo] = useState<VideoPlayerTarget>(video);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [qualityLevels, setQualityLevels] = useState<{ height: number; index: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [autoplayMutedNotice, setAutoplayMutedNotice] = useState(false);

  // YouTube Education dynamic parameter state
  const [educationParam, setEducationParam] = useState<string>(DEFAULT_EDU_PARAM);
  const [isFetchingEduParam, setIsFetchingEduParam] = useState(false);
  const [eduParamSource, setEduParamSource] = useState<string>("初期値");

  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to extract YouTube ID
  const extractYtId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)|youtubeeducation\.com\/embed\/)([\w-]{11})/
    );
    return match ? match[1] : null;
  };

  // Fetch YouTube Education parameters dynamically from /api/education-param or Google Spreadsheet
  const fetchEducationParam = useCallback(async () => {
    setIsFetchingEduParam(true);
    try {
      // 1. Fetch via API
      const res = await fetch("/api/education-param");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.param) {
          setEducationParam(json.param);
          setEduParamSource("Google Sheets (A1)");
          setIsFetchingEduParam(false);
          return json.param;
        }
      }
    } catch (e) {
      console.warn("Could not fetch via /api/education-param:", e);
    }

    // 2. Direct Fallback to Google Sheets API / CSV
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
      const res = await fetch(gvizUrl);
      if (res.ok) {
        const text = await res.text();
        const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
        const data = JSON.parse(jsonStr);
        let val = data.table?.rows?.[0]?.c?.[0]?.v;
        if (val && typeof val === "string") {
          val = val.replace(/&amp;/g, "&").trim();
          if (!val.startsWith("?")) val = "?" + val;
          setEducationParam(val);
          setEduParamSource("Google Sheets Direct");
          setIsFetchingEduParam(false);
          return val;
        }
      }
    } catch (e) {
      console.warn("Direct Google Sheets fetch error:", e);
    }

    setIsFetchingEduParam(false);
    return DEFAULT_EDU_PARAM;
  }, []);

  // Fetch education param on component mount
  useEffect(() => {
    fetchEducationParam();
  }, [fetchEducationParam]);

  // Format time (e.g. 01:23)
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return "00:00";
    const mins = Math.floor(secs / 60);
    const remSecs = Math.floor(secs % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${remSecs < 10 ? "0" : ""}${remSecs}`;
  };

  // Resolve video stream if needed
  useEffect(() => {
    let isCancelled = false;

    const resolveStream = async () => {
      const isDirectMedia =
        video.url &&
        (video.url.includes(".m3u8") ||
          video.url.includes(".mp4") ||
          video.url.includes("youtube") ||
          video.url.includes("youtu.be") ||
          video.url.includes("youtubeeducation.com"));

      const ytId = video.youtubeId || extractYtId(video.url);

      if (ytId) {
        setCurrentVideo({
          ...video,
          videoType: "youtube",
          youtubeId: ytId,
        });
        return;
      }

      if (isDirectMedia && video.videoType) {
        setCurrentVideo(video);
        return;
      }

      // If we only have tweetId or non-media URL, resolve via video-info
      if (video.tweetId || video.url) {
        setIsLoadingStream(true);
        try {
          const res = await fetch(
            `/api/realtime/video-info?id=${encodeURIComponent(
              video.tweetId || ""
            )}&url=${encodeURIComponent(video.url || "")}`
          );
          const json = await res.json();
          if (!isCancelled && json.success) {
            setCurrentVideo({
              url: json.videoUrl || video.url,
              title: json.title || video.title,
              authorName: json.authorName || video.authorName,
              authorHandle: json.authorHandle || video.authorHandle,
              poster: json.poster || video.poster,
              tweetId: json.tweetId || video.tweetId,
              tweetUrl: json.tweetUrl || video.tweetUrl,
              videoType: json.videoType || "embed",
              youtubeId: json.youtubeId,
            });
          }
        } catch (err) {
          console.error("Failed to resolve video stream:", err);
          if (!isCancelled) {
            setCurrentVideo(video);
          }
        }
      }
    };

    resolveStream();

    return () => {
      isCancelled = true;
    };
  }, [video]);

  // Video playback initialization (for non-YouTube HTML5 / HLS video)
  useEffect(() => {
    const videoEl = videoRef.current;
    const isYouTube =
      currentVideo.videoType === "youtube" ||
      currentVideo.url.includes("youtube.com") ||
      currentVideo.url.includes("youtu.be") ||
      currentVideo.url.includes("youtubeeducation.com") ||
      Boolean(currentVideo.youtubeId);

    if (isYouTube) {
      setIsLoadingStream(false);
      return;
    }

    if (!videoEl || !currentVideo.url) return;

    // Check if it's an embed/webpage URL (not playable directly in <video>)
    const isDirectPlayable =
      currentVideo.url.includes(".m3u8") ||
      currentVideo.url.includes(".mp4") ||
      currentVideo.url.includes("video.twimg.com");

    if (!isDirectPlayable && currentVideo.videoType === "embed") {
      setIsLoadingStream(false);
      return;
    }

    setIsLoadingStream(true);
    setHasError(null);

    const isM3u8 = currentVideo.url.includes(".m3u8") || currentVideo.videoType === "hls";

    const attemptAutoplay = () => {
      videoEl
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          // If browser blocked unmuted autoplay, mute and retry
          if (err.name === "NotAllowedError") {
            videoEl.muted = true;
            setIsMuted(true);
            setAutoplayMutedNotice(true);
            videoEl
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          } else {
            setIsPlaying(false);
          }
        });
    };

    if (isM3u8 && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(currentVideo.url);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoadingStream(false);
        const levels = data.levels.map((lvl, index) => ({
          height: lvl.height,
          index,
        }));
        setQualityLevels(levels);
        attemptAutoplay();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setIsLoadingStream(false);
              setHasError("動画ストリームの読み込みに失敗しました");
              break;
          }
        }
      });
    } else {
      // Native Safari HLS or direct MP4
      videoEl.src = currentVideo.url;
      const onLoaded = () => {
        setIsLoadingStream(false);
        attemptAutoplay();
      };
      const onError = () => {
        setIsLoadingStream(false);
        setHasError("動画ファイルの読み込みに失敗しました");
      };

      videoEl.addEventListener("loadedmetadata", onLoaded);
      videoEl.addEventListener("error", onError);

      return () => {
        videoEl.removeEventListener("loadedmetadata", onLoaded);
        videoEl.removeEventListener("error", onError);
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentVideo.url, currentVideo.videoType, currentVideo.youtubeId]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    setDuration(el.duration || 0);

    if (el.buffered.length > 0 && el.duration > 0) {
      const bufferedEnd = el.buffered.end(el.buffered.length - 1);
      setBufferedPercent((bufferedEnd / el.duration) * 100);
    }
  };

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
    setAutoplayMutedNotice(false);
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    const el = videoRef.current;
    if (!el) return;
    el.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      el.muted = false;
      setIsMuted(false);
    }
    setAutoplayMutedNotice(false);
  };

  const handleSpeedChange = (speed: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  const handleQualityChange = (levelIdx: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIdx;
      setCurrentQuality(levelIdx);
    }
    setShowQualityMenu(false);
  };

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  }, []);

  const togglePiP = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await el.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP failed:", err);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const el = videoRef.current;
    if (!bar || !el || !duration) return;

    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  const handleMouseMoveProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    setHoverX(e.clientX - rect.left);
  };

  // Auto-hide controls
  const handleActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "Escape") {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleFullscreen, toggleMute, isFullscreen, onClose, duration]);

  // Download video handler
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const filename = `x-video-${currentVideo.tweetId || Date.now()}.mp4`;
      const downloadUrl = `/api/proxy/download?url=${encodeURIComponent(
        currentVideo.url
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
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // YouTube video detection
  const isYouTube =
    currentVideo.videoType === "youtube" ||
    currentVideo.url.includes("youtube.com") ||
    currentVideo.url.includes("youtu.be") ||
    currentVideo.url.includes("youtubeeducation.com") ||
    Boolean(currentVideo.youtubeId);

  const resolvedYtId = currentVideo.youtubeId || extractYtId(currentVideo.url);

  // YouTube Education Embed URL with dynamic parameter compensation
  const youtubeEducationEmbedUrl = resolvedYtId
    ? `https://www.youtubeeducation.com/embed/${resolvedYtId}${educationParam}`
    : currentVideo.url;

  const isEmbedFallback =
    currentVideo.videoType === "embed" &&
    !currentVideo.url.includes(".m3u8") &&
    !currentVideo.url.includes(".mp4") &&
    !isYouTube;

  return (
    <div
      id="google-video-player-backdrop"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        id="google-video-player-container"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleActivity}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden border border-red-900/50 shadow-2xl shadow-red-950/50 flex flex-col group select-none"
      >
        {/* Top Google Video / YouTube Education Header bar */}
        <div
          className={`absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/95 via-black/70 to-transparent flex items-center justify-between gap-3 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Brand & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            {isYouTube ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-xs tracking-tight shadow-md shadow-red-600/30 shrink-0">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>YouTube Education</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-xs tracking-tight shadow-md shadow-red-600/30 shrink-0">
                <VideoIcon className="w-3.5 h-3.5" />
                <span>Google Video</span>
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-white font-semibold text-xs sm:text-sm truncate drop-shadow-md">
                {currentVideo.title || (isYouTube ? "YouTube 動画" : "X リアルタイム動画")}
              </h3>
              {currentVideo.authorName ? (
                <p className="text-[11px] text-zinc-400 truncate">
                  {currentVideo.authorName}{" "}
                  {currentVideo.authorHandle ? `(@${currentVideo.authorHandle})` : ""}
                </p>
              ) : isYouTube ? (
                <p className="text-[10px] text-red-400/90 flex items-center gap-1 truncate">
                  <span>しあTube 動的パラメータ適用中 ({eduParamSource})</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Top Actions: Param Refresh (YouTube), Download, External link, Close */}
          <div className="flex items-center gap-2 shrink-0">
            {isYouTube && (
              <button
                id="gplayer-refresh-param-btn"
                onClick={fetchEducationParam}
                disabled={isFetchingEduParam}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="GoogleスプレッドシートからYouTube Educationパラメータを再取得"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-red-400 ${isFetchingEduParam ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">パラメータ更新</span>
              </button>
            )}

            {!isYouTube && !isEmbedFallback && (
              <button
                id="gplayer-download-btn"
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20 active:scale-95"
                title="動画をダウンロード"
              >
                <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
                <span className="hidden sm:inline">
                  {isDownloading ? "保存中..." : "保存・DL"}
                </span>
              </button>
            )}

            {isYouTube && resolvedYtId ? (
              <a
                href={`https://www.youtube.com/watch?v=${resolvedYtId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="YouTube公式で開く"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : currentVideo.tweetUrl ? (
              <a
                href={currentVideo.tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="Xでポストを開く"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}

            <button
              id="gplayer-close-btn"
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-red-600 text-zinc-300 hover:text-white transition-colors"
              title="閉じる (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Body */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {/* 1. YouTube Education Video Embed (youtubeeducation.com/embed/${videoId}${param}) */}
          {isYouTube ? (
            <div className="relative w-full h-full bg-black">
              <iframe
                src={youtubeEducationEmbedUrl}
                title={currentVideo.title || "YouTube Education Player"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="w-full h-full border-0"
              />
            </div>
          ) : isEmbedFallback ? (
            /* 2. Fallback Card when direct HLS stream is restricted */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-950/80">
              {currentVideo.poster && (
                <img
                  src={currentVideo.poster}
                  alt="Video thumbnail"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-sm"
                />
              )}
              <div className="relative z-10 max-w-md p-6 rounded-2xl bg-black/80 border border-zinc-800 shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-400 border border-red-600/40 flex items-center justify-center mx-auto">
                  <VideoIcon className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm sm:text-base">
                    {currentVideo.authorName
                      ? `${currentVideo.authorName} の動画ポスト`
                      : "𝕏 動画ポスト"}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {currentVideo.title}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <a
                    href={
                      currentVideo.tweetUrl ||
                      (currentVideo.tweetId
                        ? `https://x.com/i/status/${currentVideo.tweetId}`
                        : currentVideo.url)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/40 transition-all active:scale-95"
                  >
                    <span>𝕏 で動画を見る</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* 3. Native HLS / MP4 HTML5 Video with Custom Controls */
            <div
              className="relative w-full h-full flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <video
                ref={videoRef}
                id="gplayer-video-element"
                className="w-full h-full object-contain"
                playsInline
                poster={currentVideo.poster}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Autoplay muted notice */}
              {autoplayMutedNotice && isPlaying && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-red-600/90 text-white text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce cursor-pointer"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>消音中：タップして音声をONにする</span>
                </div>
              )}

              {/* Loading indicator */}
              {isLoadingStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3 z-20">
                  <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-zinc-300 tracking-wider">
                    Google Video 読み込み中...
                  </span>
                </div>
              )}

              {/* Error display */}
              {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center z-20">
                  <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                  <p className="text-red-400 text-sm font-semibold mb-3">{hasError}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                      }}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                    >
                      直接ダウンロード
                    </button>
                    {currentVideo.tweetUrl && (
                      <a
                        href={currentVideo.tweetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <span>𝕏 で開く</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Big Center Play Button when paused */}
              {!isPlaying && !isLoadingStream && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transform scale-100 group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar (for HTML5 / HLS video) */}
        {!isYouTube && !isEmbedFallback && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 p-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-2 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Custom Red Progress Scrubber Bar */}
            <div
              ref={progressBarRef}
              id="gplayer-progress-bar"
              onClick={handleSeek}
              onMouseMove={handleMouseMoveProgress}
              onMouseEnter={() => setIsHoveringBar(true)}
              onMouseLeave={() => setIsHoveringBar(false)}
              className="relative w-full h-2 hover:h-3.5 bg-zinc-800/80 rounded-full cursor-pointer transition-all duration-150 group/bar flex items-center"
            >
              {/* Buffered Progress */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-zinc-600/50 rounded-full pointer-events-none"
                style={{ width: `${bufferedPercent}%` }}
              />

              {/* Current Playback Progress */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full pointer-events-none shadow-sm shadow-red-600"
                style={{ width: `${currentPercent}%` }}
              />

              {/* Scrubber Knob */}
              <div
                className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md -translate-x-1/2 pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity"
                style={{ left: `${currentPercent}%` }}
              />

              {/* Hover Time Tooltip */}
              {isHoveringBar && hoverTime !== null && (
                <div
                  className="absolute bottom-5 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-white font-mono pointer-events-none shadow-md"
                  style={{ left: `${hoverX}px` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Bottom Row Controls */}
            <div className="flex items-center justify-between gap-3 text-white">
              {/* Left: Play/Pause, Volume, Time */}
              <div className="flex items-center gap-3">
                <button
                  id="gplayer-play-toggle-btn"
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg hover:bg-zinc-800/80 text-white transition-colors"
                  title={isPlaying ? "一時停止 (Space)" : "再生 (Space)"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-zinc-800/80 text-white transition-colors"
                    title={isMuted ? "ミュート解除 (M)" : "ミュート (M)"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-red-500" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 h-1 accent-red-600 bg-zinc-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Timestamp */}
                <div className="text-xs font-mono text-zinc-300">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-zinc-500 mx-1">/</span>
                  <span className="text-zinc-400">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right: Quality, Speed, PiP, Fullscreen */}
              <div className="flex items-center gap-1.5 relative">
                {/* Speed Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                      playbackRate !== 1
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
                    }`}
                    title="再生速度"
                  >
                    {playbackRate}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-8 right-0 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 z-40 min-w-[70px]">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => handleSpeedChange(spd)}
                          className={`px-2.5 py-1 text-xs rounded-lg text-left font-medium transition-colors ${
                            playbackRate === spd
                              ? "bg-red-600 text-white font-bold"
                              : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality Selector (HLS) */}
                {qualityLevels.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        currentQuality !== -1
                          ? "bg-red-600 text-white"
                          : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
                      }`}
                      title="画質設定"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    {showQualityMenu && (
                      <div className="absolute bottom-8 right-0 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 z-40 min-w-[90px]">
                        <button
                          onClick={() => handleQualityChange(-1)}
                          className={`px-2.5 py-1 text-xs rounded-lg text-left font-medium flex items-center justify-between ${
                            currentQuality === -1
                              ? "bg-red-600 text-white font-bold"
                              : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <span>自動</span>
                          {currentQuality === -1 && <Check className="w-3 h-3" />}
                        </button>
                        {qualityLevels.map((lvl) => (
                          <button
                            key={lvl.index}
                            onClick={() => handleQualityChange(lvl.index)}
                            className={`px-2.5 py-1 text-xs rounded-lg text-left font-medium flex items-center justify-between ${
                              currentQuality === lvl.index
                                ? "bg-red-600 text-white font-bold"
                                : "text-zinc-300 hover:bg-zinc-800"
                            }`}
                          >
                            <span>{lvl.height}p</span>
                            {currentQuality === lvl.index && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PiP Button */}
                <button
                  onClick={togglePiP}
                  className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="ピクチャー・イン・ピクチャー"
                >
                  <Tv className="w-4 h-4" />
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="全画面表示 (F)"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
