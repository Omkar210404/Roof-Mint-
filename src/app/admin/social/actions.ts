'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'

export type SocialVideo = {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
  url: string
  views: number
  likes: number
  comments: number
}

export type SocialStats = {
  youtube: {
    connected: boolean
    channelTitle?: string
    subscriberCount?: number
    totalViews?: number
    videos: SocialVideo[]
  }
  facebook: { connected: false }
  instagram: { connected: false }
}

// Uses the uploads-playlist route (channels -> playlistItems -> videos)
// instead of search.list, since search.list costs 100 quota units per call
// against a 10,000/day budget while this path costs ~3 total regardless of
// how many videos exist.
async function getYouTubeStats(): Promise<SocialStats['youtube']> {
  const apiKey = process.env.YOUTUBE_API_KEY
  const channelId = process.env.YOUTUBE_CHANNEL_ID
  if (!apiKey || !channelId) {
    return { connected: false, videos: [] }
  }

  try {
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`
    )
    const channelData = await channelRes.json()
    const channel = channelData.items?.[0]
    if (!channel) return { connected: false, videos: [] }

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
    let videos: SocialVideo[] = []

    if (uploadsPlaylistId) {
      const playlistRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=25&key=${apiKey}`
      )
      const playlistData = await playlistRes.json()
      const videoIds = (playlistData.items || [])
        .map((item: any) => item.snippet?.resourceId?.videoId)
        .filter(Boolean)

      if (videoIds.length > 0) {
        const videosRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${apiKey}`
        )
        const videosData = await videosRes.json()
        videos = (videosData.items || [])
          .map((v: any) => ({
            id: v.id,
            title: v.snippet?.title || 'Untitled',
            thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '',
            publishedAt: v.snippet?.publishedAt,
            url: `https://www.youtube.com/watch?v=${v.id}`,
            views: Number(v.statistics?.viewCount || 0),
            likes: Number(v.statistics?.likeCount || 0),
            comments: Number(v.statistics?.commentCount || 0),
          }))
          .sort((a: SocialVideo, b: SocialVideo) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      }
    }

    return {
      connected: true,
      channelTitle: channel.snippet?.title,
      subscriberCount: Number(channel.statistics?.subscriberCount || 0),
      totalViews: Number(channel.statistics?.viewCount || 0),
      videos,
    }
  } catch (error: any) {
    console.error('getYouTubeStats error:', error.message)
    return { connected: false, videos: [] }
  }
}

export async function getSocialStats(): Promise<SocialStats> {
  const { authorized } = await requireAdmin()
  if (!authorized) {
    return {
      youtube: { connected: false, videos: [] },
      facebook: { connected: false },
      instagram: { connected: false },
    }
  }

  const youtube = await getYouTubeStats()

  return {
    youtube,
    // Facebook/Instagram go through the Meta Graph API, which needs a
    // Business app + Page access token — not set up yet. These stay as
    // "not connected" placeholders until those credentials exist.
    facebook: { connected: false },
    instagram: { connected: false },
  }
}
