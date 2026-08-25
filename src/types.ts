export interface BuzzTrendItem {
  rank: number;
  query: string;
  url: string;
  rankUp: number;
  rankDiff: number;
  childBuzz: string[];
  tweetCount: number;
  genre: string;
  positive: number;
  negative: number;
}

export interface HotBuzzItem {
  query: string;
  url: string;
}

export interface DelayRailItem {
  railName: string;
  url: string;
}

export interface DelayRailData {
  tabItems: string[];
  areaItems: Record<string, DelayRailItem[]>;
}

export interface PopularTweet {
  url: string;
  body: string;
  imageUrl?: string;
  tweetId: string;
  quote?: number;
  reply?: number;
  rt?: number;
  like?: number;
  time: string;
  mediaType?: string;
  pos?: string;
}

export interface RealtimeTrendsResponse {
  success: boolean;
  timestamp: number;
  formattedTime: string;
  trends: BuzzTrendItem[];
  hotBuzz: HotBuzzItem[];
  popularTweets: PopularTweet[];
  railwayDelays: DelayRailData;
  error?: string;
}

export interface TimelineMedia {
  type: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  displayUrl?: string;
  duration?: number;
}

export interface VideoPlayerTarget {
  url: string;
  title: string;
  authorName?: string;
  authorHandle?: string;
  poster?: string;
  tweetId?: string;
  tweetUrl?: string;
  videoType?: "hls" | "mp4" | "youtube" | "embed";
  youtubeId?: string;
}

export interface ImagePreviewTarget {
  url: string;
  title?: string;
  filename?: string;
  tweetUrl?: string;
  authorName?: string;
}

export interface TimelineTweet {
  id: string;
  url: string;
  displayText: string;
  displayTextBody?: string;
  createdAt: number;
  formattedTime?: string;
  name: string;
  screenName: string;
  profileImage: string;
  rtCount: number;
  likesCount: number;
  replyCount: number;
  qtCount?: number;
  media: TimelineMedia[];
  hashtags?: string[];
  userUrl?: string;
}

export interface KeywordSearchResponse {
  success: boolean;
  query: string;
  timestamp: number;
  totalResultsAvailable: number;
  tweets: TimelineTweet[];
  relatedHashtags?: string[];
  error?: string;
}
