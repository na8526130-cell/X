import React, { useState } from "react";
import { Download, ExternalLink, X, ZoomIn, ZoomOut, Check } from "lucide-react";
import { ImagePreviewTarget } from "../types";

interface ImageModalProps {
  image: ImagePreviewTarget;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ image, onClose }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const filename = image.filename || `x-image-${Date.now()}.jpg`;
      const downloadUrl = `/api/proxy/download?url=${encodeURIComponent(image.url)}&filename=${encodeURIComponent(filename)}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error("Image download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      id="image-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        id="image-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl max-h-[92vh] bg-zinc-950 border border-red-900/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header bar */}
        <div className="p-3 sm:p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-white font-bold text-sm truncate">
              {image.title || "X 添付画像"}
            </h3>
            {image.authorName && (
              <p className="text-xs text-zinc-400 truncate">投稿者: {image.authorName}</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="image-zoom-toggle-btn"
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title={isZoomed ? "縮小" : "拡大"}
            >
              {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>

            <button
              id="image-download-btn"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/30 active:scale-95"
              title="画像をダウンロード"
            >
              {downloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>保存完了</span>
                </>
              ) : (
                <>
                  <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
                  <span>{isDownloading ? "DL中..." : "画像保存・DL"}</span>
                </>
              )}
            </button>

            {image.tweetUrl && (
              <a
                href={image.tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                title="Xで投稿を開く"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              id="image-modal-close-btn"
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white transition-colors ml-1"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image canvas */}
        <div
          className={`flex-1 overflow-auto bg-black flex items-center justify-center p-2 min-h-[300px] cursor-${
            isZoomed ? "zoom-out" : "zoom-in"
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={image.url}
            alt={image.title || "Image"}
            referrerPolicy="no-referrer"
            className={`transition-all duration-200 rounded-lg max-h-[80vh] object-contain ${
              isZoomed ? "scale-150 cursor-zoom-out" : "scale-100"
            }`}
          />
        </div>
      </div>
    </div>
  );
};
