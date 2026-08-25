import express from "express";

const app = express();

app.use(express.json());

// In-memory cache for realtime trends (15 seconds cache)
let trendsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 1000;

// Helper to clean Yahoo highlighter tokens (\tSTART\t...\tEND\t)
function cleanYahooTokens(text: string): string {
  if (!text) return "";
  return text.replace(/\tSTART\t/g, "").replace(/\tEND\t/g, "").trim();
}

// Helper to format timestamps to JST time string
function formatJST(timestampSeconds?: number): string {
  const date = timestampSeconds ? new Date(timestampSeconds * 1000) : new Date();
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Fetch Yahoo Realtime Top Page
async function fetchYahooRealtimePage() {
  const now = Date.now();
  if (trendsCache && now - trendsCache.timestamp < CACHE_TTL_MS) {
    return trendsCache.data;
  }

  const response = await fetch("https://search.yahoo.co.jp/realtime", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Realtime returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/
  );

  if (!nextDataMatch) {
    throw new Error("Failed to locate __NEXT_DATA__ in Yahoo Realtime HTML");
  }

  const parsed = JSON.parse(nextDataMatch[1]);
  const pageData = parsed.props?.pageProps?.pageData || {};

  const rawTrends = pageData.buzzTrend?.items || [];
  const trends = rawTrends.map((item: any, idx: number) => ({
    rank: idx + 1,
    query: item.query || "",
    url: item.url ? (item.url.startsWith("http") ? item.url : `https://search.yahoo.co.jp${item.url}`) : "",
    rankUp: item.rankUp ?? 0,
    rankDiff: item.rankDiff ?? 0,
    childBuzz: Array.isArray(item.childBuzz) ? item.childBuzz : [],
    tweetCount: item.tweetCount ?? 0,
    genre: item.genre || "一般",
    positive: item.positive ?? 0,
    negative: item.negative ?? 0,
  }));

  const rawHotBuzz = pageData.hotBuzz?.items || [];
  const hotBuzz = rawHotBuzz.map((item: any) => ({
    query: item.query || "",
    url: item.url || "",
  }));

  const rawPopTw = pageData.poptw?.items || [];
  const popularTweets = rawPopTw.map((tw: any) => ({
    url: tw.url ? (tw.url.startsWith("http") ? tw.url : `https://search.yahoo.co.jp${tw.url}`) : "",
    body: cleanYahooTokens(tw.body || ""),
    imageUrl: tw.imageUrl || "",
    tweetId: tw.tweetId || "",
    quote: tw.quote ?? 0,
    reply: tw.reply ?? 0,
    rt: tw.rt ?? 0,
    like: tw.like ?? 0,
    time: tw.time || "",
    mediaType: tw.mediaType || "",
    pos: tw.pos || "",
  }));

  const delayRail = pageData.delayRail || {
    tabItems: [],
    areaItems: {},
  };

  const result = {
    success: true,
    timestamp: pageData.buzzTrend?.buzzTimestamp || Math.floor(Date.now() / 1000),
    formattedTime: formatJST(pageData.buzzTrend?.buzzTimestamp),
    trends,
    hotBuzz,
    popularTweets,
    railwayDelays: delayRail,
  };

  trendsCache = {
    data: result,
    timestamp: now,
  };

  return result;
}

// Helper to extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)|youtubeeducation\.com\/embed\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

const EDUCATION_SPREADSHEET_ID = "1dily2wiik92TAyK3zyIsu8TDuyYNoF20IM1iMk_X-pg";
let cachedEducationParam = "";
let cachedEducationParamTime = 0;

async function getYouTubeEducationParam(): Promise<string> {
  const now = Date.now();
  if (cachedEducationParam && now - cachedEducationParamTime < 30000) {
    return cachedEducationParam;
  }

  // Method 1: Google Spreadsheet Visualization API
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${EDUCATION_SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
    const res = await fetch(gvizUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (res.ok) {
      const text = await res.text();
      const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const data = JSON.parse(jsonStr);
      let val = data.table?.rows?.[0]?.c?.[0]?.v || "";
      if (val && typeof val === "string") {
        val = val.replace(/&amp;/g, "&").trim();
        if (!val.startsWith("?")) val = "?" + val;
        cachedEducationParam = val;
        cachedEducationParamTime = now;
        return val;
      }
    }
  } catch (err) {
    console.error("Error fetching education param via gviz:", err);
  }

  // Method 2: Google Spreadsheet CSV Export
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${EDUCATION_SPREADSHEET_ID}/export?format=csv`;
    const res = await fetch(csvUrl);
    if (res.ok) {
      const text = await res.text();
      const firstLine = text.split("\n")[0]?.replace(/^"|"$/g, "").trim();
      if (firstLine && firstLine.includes("autoplay")) {
        let val = firstLine.replace(/&amp;/g, "&").trim();
        if (!val.startsWith("?")) val = "?" + val;
        cachedEducationParam = val;
        cachedEducationParamTime = now;
        return val;
      }
    }
  } catch (err) {
    console.error("Error fetching education param via csv:", err);
  }

  return (
    cachedEducationParam ||
    "?autoplay=1&mute=0&controls=1&start=0&origin=https%3A%2F%2Fcreate.kahoot.it&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&fs=1&cc_load_policy=0&enablejsapi=1"
  );
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), service: "x-realtime-viewer" });
});

// GET /api/education-param
app.get("/api/education-param", async (_req, res) => {
  try {
    const param = await getYouTubeEducationParam();
    res.json({
      success: true,
      param,
      spreadsheetId: EDUCATION_SPREADSHEET_ID,
      embedBase: "https://www.youtubeeducation.com/embed/",
      updatedAt: new Date(cachedEducationParamTime).toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/realtime/trends
app.get("/api/realtime/trends", async (req, res) => {
  const forceRefresh = req.query.fresh === "true" || req.query.fresh === "1";
  if (forceRefresh) {
    trendsCache = null;
  }

  try {
    const data = await fetchYahooRealtimePage();
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching Yahoo Realtime trends:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch realtime data",
      timestamp: Math.floor(Date.now() / 1000),
      formattedTime: formatJST(),
      trends: [],
      hotBuzz: [],
      popularTweets: [],
      railwayDelays: { tabItems: [], areaItems: {} },
    });
  }
});

// GET /api/realtime/search?p=keyword&md=t|h|all
app.get("/api/realtime/search", async (req, res) => {
  const query = typeof req.query.p === "string" ? req.query.p.trim() : "";
  const mdParam = typeof req.query.md === "string" ? req.query.md : "t"; // default to "t" (latest)
  const sinceId = typeof req.query.sinceId === "string" ? req.query.sinceId : "";

  if (!query) {
    return res.status(400).json({
      success: false,
      error: "Query parameter 'p' is required",
      tweets: [],
    });
  }

  const parseEntriesFromUrl = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Search returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/
    );

    if (!nextDataMatch) {
      throw new Error("Failed to parse search results page");
    }

    const parsed = JSON.parse(nextDataMatch[1]);
    const pageData = parsed.props?.pageProps?.pageData || {};
    const timeline = pageData.timeline || {};
    const entries = timeline.entry || [];
    return {
      entries,
      totalResultsAvailable: timeline.head?.totalResultsAvailable,
      relatedHashtag: pageData.relatedHashtag,
    };
  };

  try {
    const encoded = encodeURIComponent(query);
    let allEntries: any[] = [];
    let totalResultsAvailable = 0;
    let relatedHashtags: string[] = [];

    if (mdParam === "all") {
      const [resLatest, resHot] = await Promise.allSettled([
        parseEntriesFromUrl(`https://search.yahoo.co.jp/realtime/search?p=${encoded}&ei=UTF-8&md=t`),
        parseEntriesFromUrl(`https://search.yahoo.co.jp/realtime/search?p=${encoded}&ei=UTF-8&md=h`),
      ]);

      const map = new Map<string, any>();
      if (resLatest.status === "fulfilled") {
        totalResultsAvailable = resLatest.value.totalResultsAvailable || 0;
        relatedHashtags = resLatest.value.relatedHashtag || [];
        for (const e of resLatest.value.entries) {
          if (e.id) map.set(e.id, e);
        }
      }
      if (resHot.status === "fulfilled") {
        if (!totalResultsAvailable) totalResultsAvailable = resHot.value.totalResultsAvailable || 0;
        if (relatedHashtags.length === 0) relatedHashtags = resHot.value.relatedHashtag || [];
        for (const e of resHot.value.entries) {
          if (e.id && !map.has(e.id)) map.set(e.id, e);
        }
      }
      allEntries = Array.from(map.values());
    } else {
      const mode = mdParam === "h" ? "h" : "t";
      const targetUrl = `https://search.yahoo.co.jp/realtime/search?p=${encoded}&ei=UTF-8&md=${mode}`;
      const result = await parseEntriesFromUrl(targetUrl);
      allEntries = result.entries;
      totalResultsAvailable = result.totalResultsAvailable || allEntries.length;
      relatedHashtags = result.relatedHashtag || [];
    }

    const tweets = allEntries.map((entry: any) => {
      const mediaList: any[] = [];
      if (Array.isArray(entry.media)) {
        for (const m of entry.media) {
          if (m.item?.mediaUrl || m.metaImageUrl) {
            mediaList.push({
              type: m.type || "image",
              mediaUrl: m.item?.mediaUrl || m.metaImageUrl,
              thumbnailUrl: m.item?.thumbnailImageUrl || m.metaImageUrl,
              displayUrl: m.item?.displayUrl || "",
            });
          }
        }
      }

      return {
        id: entry.id || "",
        url: entry.url || "",
        displayText: cleanYahooTokens(entry.displayText || entry.displayTextBody || ""),
        displayTextBody: cleanYahooTokens(entry.displayTextBody || ""),
        createdAt: entry.createdAt || 0,
        formattedTime: formatJST(entry.createdAt),
        name: entry.name || "",
        screenName: entry.screenName || "",
        profileImage: entry.profileImage || "",
        rtCount: entry.rtCount ?? 0,
        likesCount: entry.likesCount ?? 0,
        replyCount: entry.replyCount ?? 0,
        qtCount: entry.qtCount ?? 0,
        media: mediaList,
        hashtags: Array.isArray(entry.hashtags) ? entry.hashtags : [],
        userUrl: entry.userUrl || (entry.screenName ? `https://x.com/${entry.screenName}` : ""),
      };
    });

    let newTweets = tweets;
    if (sinceId) {
      newTweets = tweets.filter((t) => BigInt(t.id || "0") > BigInt(sinceId));
    }

    res.json({
      success: true,
      query,
      md: mdParam,
      timestamp: Math.floor(Date.now() / 1000),
      totalResultsAvailable: totalResultsAvailable || tweets.length,
      tweets: newTweets,
      relatedHashtags,
    });
  } catch (err: any) {
    console.error(`Error searching realtime for query "${query}":`, err);
    res.status(500).json({
      success: false,
      query,
      error: err.message || "Failed to search realtime tweets",
      totalResultsAvailable: 0,
      tweets: [],
    });
  }
});

// GET /api/realtime/tweet-detail?id=tweetId
app.get("/api/realtime/tweet-detail", async (req, res) => {
  const tweetId = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!tweetId) {
    return res.status(400).json({ success: false, error: "Tweet ID is required" });
  }

  try {
    const targetUrl = `https://search.yahoo.co.jp/realtime/search/tweet/${tweetId}`;
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Tweet Detail returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/
    );

    if (!nextDataMatch) {
      throw new Error("Failed to parse tweet detail page");
    }

    const parsed = JSON.parse(nextDataMatch[1]);
    const pageData = parsed.props?.pageProps?.pageData || {};
    const bestTweet = pageData.bestTweet || {};

    const mediaList: any[] = [];
    if (Array.isArray(bestTweet.media)) {
      for (const m of bestTweet.media) {
        mediaList.push({
          type: m.type || "image",
          mediaUrl: m.item?.mediaUrl || m.metaImageUrl,
          thumbnailUrl: m.item?.thumbnailImageUrl || m.metaImageUrl,
          displayUrl: m.item?.displayUrl || "",
          duration: m.item?.duration || 0,
        });
      }
    }

    res.json({
      success: true,
      tweet: {
        id: bestTweet.id || tweetId,
        url: bestTweet.url || `https://x.com/i/status/${tweetId}`,
        displayText: cleanYahooTokens(bestTweet.displayText || bestTweet.displayTextBody || ""),
        createdAt: bestTweet.createdAt || 0,
        formattedTime: formatJST(bestTweet.createdAt),
        name: bestTweet.name || "",
        screenName: bestTweet.screenName || "",
        profileImage: bestTweet.profileImage || "",
        rtCount: bestTweet.rtCount ?? 0,
        likesCount: bestTweet.likesCount ?? 0,
        replyCount: bestTweet.replyCount ?? 0,
        media: mediaList,
        userUrl: bestTweet.userUrl || `https://x.com/${bestTweet.screenName || ""}`,
      },
    });
  } catch (err: any) {
    console.error(`Error fetching tweet detail for ${tweetId}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/realtime/video-info?id=tweetId&url=...
app.get("/api/realtime/video-info", async (req, res) => {
  const tweetId = typeof req.query.id === "string" ? req.query.id.trim() : "";
  const directUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";

  // Check if direct URL is YouTube
  if (
    directUrl &&
    (directUrl.includes("youtube.com") ||
      directUrl.includes("youtu.be") ||
      directUrl.includes("youtubeeducation.com"))
  ) {
    const ytId = extractYouTubeId(directUrl);
    const eduParam = await getYouTubeEducationParam();
    return res.json({
      success: true,
      videoUrl: ytId ? `https://www.youtubeeducation.com/embed/${ytId}${eduParam}` : directUrl,
      videoType: "youtube",
      youtubeId: ytId,
      educationParam: eduParam,
      title: "YouTube 動画 (YouTube Education)",
      tweetId,
      tweetUrl: directUrl,
    });
  }

  // Check if direct URL is already an HLS stream (.m3u8) or MP4
  if (directUrl && (directUrl.includes(".m3u8") || directUrl.includes(".mp4"))) {
    return res.json({
      success: true,
      videoUrl: directUrl,
      videoType: directUrl.includes(".m3u8") ? "hls" : "mp4",
      title: "X 動画ストリーム",
      tweetId,
      tweetUrl: tweetId ? `https://x.com/i/status/${tweetId}` : directUrl,
    });
  }

  if (!tweetId) {
    return res.status(400).json({ success: false, error: "id or valid video url is required" });
  }

  try {
    const targetUrl = `https://search.yahoo.co.jp/realtime/search/tweet/${tweetId}`;
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return res.json({
        success: true,
        videoUrl: `https://x.com/i/status/${tweetId}`,
        videoType: "embed",
        title: "X 投稿動画",
        tweetId,
        tweetUrl: `https://x.com/i/status/${tweetId}`,
      });
    }

    const html = await response.text();
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/
    );

    if (!nextDataMatch) {
      return res.json({
        success: true,
        videoUrl: `https://x.com/i/status/${tweetId}`,
        videoType: "embed",
        title: "X 投稿動画",
        tweetId,
        tweetUrl: `https://x.com/i/status/${tweetId}`,
      });
    }

    const parsed = JSON.parse(nextDataMatch[1]);
    const pageData = parsed.props?.pageProps?.pageData || {};
    const bestTweet = pageData.bestTweet || {};

    const mediaList = Array.isArray(bestTweet.media) ? bestTweet.media : [];

    const videoMedia = mediaList.find(
      (m: any) =>
        m.type === "video" ||
        m.item?.mediaUrl?.includes(".m3u8") ||
        m.item?.mediaUrl?.includes(".mp4")
    );
    const ytMedia = mediaList.find(
      (m: any) =>
        m.type === "youTube" ||
        m.item?.mediaUrl?.includes("youtu") ||
        m.item?.mediaUrl?.includes("youtube")
    );
    const imageMedia = mediaList.find((m: any) => m.type === "image" || m.item?.mediaUrl);

    let resolvedVideoUrl = "";
    let resolvedType: "hls" | "mp4" | "youtube" | "embed" = "embed";
    let ytId: string | null = null;
    let poster = "";
    let educationParam = "";

    if (videoMedia) {
      const mediaUrl = videoMedia.item?.mediaUrl || videoMedia.metaImageUrl;
      poster = videoMedia.item?.thumbnailImageUrl || videoMedia.metaImageUrl || "";
      if (mediaUrl) {
        resolvedVideoUrl = mediaUrl;
        resolvedType = mediaUrl.includes(".m3u8") ? "hls" : "mp4";
      }
    } else if (ytMedia) {
      const ytUrl = ytMedia.item?.mediaUrl || ytMedia.item?.url || "";
      ytId = extractYouTubeId(ytUrl);
      if (ytId) {
        educationParam = await getYouTubeEducationParam();
        resolvedVideoUrl = `https://www.youtubeeducation.com/embed/${ytId}${educationParam}`;
        resolvedType = "youtube";
        poster = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
    }

    if (!resolvedVideoUrl) {
      resolvedVideoUrl = `https://x.com/i/status/${tweetId}`;
      resolvedType = "embed";
      if (imageMedia) {
        poster = imageMedia.item?.thumbnailImageUrl || imageMedia.item?.mediaUrl || "";
      }
    }

    res.json({
      success: true,
      videoUrl: resolvedVideoUrl,
      videoType: resolvedType,
      youtubeId: ytId,
      title: cleanYahooTokens(bestTweet.displayText || bestTweet.displayTextBody || "X 投稿動画"),
      authorName: bestTweet.name || "",
      authorHandle: bestTweet.screenName || "",
      poster,
      tweetId,
      tweetUrl: `https://x.com/i/status/${tweetId}`,
    });
  } catch (err: any) {
    console.error("Error in video-info resolver:", err);
    res.json({
      success: true,
      videoUrl: `https://x.com/i/status/${tweetId}`,
      videoType: "embed",
      title: "X 投稿動画",
      tweetId,
      tweetUrl: `https://x.com/i/status/${tweetId}`,
    });
  }
});

// GET /api/proxy/download?url=...&filename=...
app.get("/api/proxy/download", async (req, res) => {
  const mediaUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
  const filename = typeof req.query.filename === "string" ? req.query.filename.trim() : "x-media";

  if (!mediaUrl) {
    return res.status(400).send("URL parameter is required");
  }

  try {
    const upstreamRes = await fetch(mediaUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://x.com/",
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send(`Failed to fetch media: ${upstreamRes.statusText}`);
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`
    );
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Pipe response
    const arrayBuffer = await upstreamRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("Proxy download error:", err);
    res.status(500).send(`Download failed: ${err.message}`);
  }
});

export default app;
