'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'

export type SocialPost = {
  id: string
  platform: 'youtube' | 'facebook' | 'instagram'
  title: string
  thumbnail: string
  publishedAt: string
  url: string
  views: number | null
  likes: number
  comments: number
}

export type SocialStats = {
  youtube: {
    connected: boolean
    channelTitle?: string
    subscriberCount?: number
    totalViews?: number
  }
  facebook: {
    connected: boolean
    pageName?: string
    followerCount?: number
  }
  instagram: {
    connected: boolean
    username?: string
    followerCount?: number
    mediaCount?: number
  }
  posts: SocialPost[]
}

// Uses the uploads-playlist route (channels -> playlistItems -> videos)
// instead of search.list, since search.list costs 100 quota units per call
// against a 10,000/day budget while this path costs ~3 total regardless of
// how many videos exist.
async function getYouTubeStats(): Promise<{ meta: SocialStats['youtube']; posts: SocialPost[] }> {
  const apiKey = process.env.YOUTUBE_API_KEY
  const channelId = process.env.YOUTUBE_CHANNEL_ID
  if (!apiKey || !channelId) {
    return { meta: { connected: false }, posts: [] }
  }

  try {
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`
    )
    const channelData = await channelRes.json()
    const channel = channelData.items?.[0]
    if (!channel) return { meta: { connected: false }, posts: [] }

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
    let posts: SocialPost[] = []

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
        posts = (videosData.items || []).map((v: any) => ({
          id: v.id,
          platform: 'youtube' as const,
          title: v.snippet?.title || 'Untitled',
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '',
          publishedAt: v.snippet?.publishedAt,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          views: Number(v.statistics?.viewCount || 0),
          likes: Number(v.statistics?.likeCount || 0),
          comments: Number(v.statistics?.commentCount || 0),
        }))
      }
    }

    return {
      meta: {
        connected: true,
        channelTitle: channel.snippet?.title,
        subscriberCount: Number(channel.statistics?.subscriberCount || 0),
        totalViews: Number(channel.statistics?.viewCount || 0),
      },
      posts,
    }
  } catch (error: any) {
    console.error('getYouTubeStats error:', error.message)
    return { meta: { connected: false }, posts: [] }
  }
}

async function getFacebookStats(): Promise<{ meta: SocialStats['facebook']; posts: SocialPost[] }> {
  const token = process.env.META_PAGE_ACCESS_TOKEN
  const pageId = process.env.META_PAGE_ID
  if (!token || !pageId) {
    return { meta: { connected: false }, posts: [] }
  }

  try {
    const pageRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=name,followers_count&access_token=${token}`
    )
    const page = await pageRes.json()
    if (page.error) throw new Error(page.error.message)

    const postsRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/published_posts?fields=id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true)&limit=25&access_token=${token}`
    )
    const postsData = await postsRes.json()
    const posts: SocialPost[] = (postsData.data || [])
      .filter((p: any) => p.message) // skip cover/profile-photo-update posts with no real content
      .map((p: any) => ({
        id: p.id,
        platform: 'facebook' as const,
        title: (p.message || '').split('\n')[0].slice(0, 80) || 'Untitled post',
        thumbnail: p.full_picture || '',
        publishedAt: p.created_time,
        url: p.permalink_url || `https://www.facebook.com/${p.id}`,
        views: null,
        likes: Number(p.likes?.summary?.total_count || 0),
        comments: Number(p.comments?.summary?.total_count || 0),
      }))

    return {
      meta: {
        connected: true,
        pageName: page.name,
        followerCount: Number(page.followers_count || 0),
      },
      posts,
    }
  } catch (error: any) {
    console.error('getFacebookStats error:', error.message)
    return { meta: { connected: false }, posts: [] }
  }
}

async function getInstagramStats(): Promise<{ meta: SocialStats['instagram']; posts: SocialPost[] }> {
  const token = process.env.META_PAGE_ACCESS_TOKEN
  const igId = process.env.META_INSTAGRAM_ACCOUNT_ID
  if (!token || !igId) {
    return { meta: { connected: false }, posts: [] }
  }

  try {
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=username,followers_count,media_count&access_token=${token}`
    )
    const profile = await profileRes.json()
    if (profile.error) throw new Error(profile.error.message)

    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,media_url,thumbnail_url,permalink&limit=25&access_token=${token}`
    )
    const mediaData = await mediaRes.json()

    // Views come from a separate per-media insights call, not the /media
    // list itself. One extra request per post is fine at this volume;
    // wrapped per-post so one unsupported media type (older IMAGE posts
    // sometimes don't support the "views" metric) doesn't blank out the rest.
    const posts: SocialPost[] = await Promise.all((mediaData.data || []).map(async (m: any) => {
      let views: number | null = null
      try {
        const insightsRes = await fetch(
          `https://graph.facebook.com/v21.0/${m.id}/insights?metric=views&access_token=${token}`
        )
        const insightsData = await insightsRes.json()
        views = Number(insightsData.data?.[0]?.values?.[0]?.value ?? null) || null
      } catch {
        // leave views null
      }

      return {
        id: m.id,
        platform: 'instagram' as const,
        title: (m.caption || '').split('\n')[0].slice(0, 80) || 'Untitled post',
        thumbnail: m.thumbnail_url || m.media_url || '',
        publishedAt: m.timestamp,
        url: m.permalink || `https://www.instagram.com/p/${m.id}`,
        views,
        likes: Number(m.like_count || 0),
        comments: Number(m.comments_count || 0),
      }
    }))

    return {
      meta: {
        connected: true,
        username: profile.username,
        followerCount: Number(profile.followers_count || 0),
        mediaCount: Number(profile.media_count || 0),
      },
      posts,
    }
  } catch (error: any) {
    console.error('getInstagramStats error:', error.message)
    return { meta: { connected: false }, posts: [] }
  }
}

export async function getSocialStats(): Promise<SocialStats> {
  const { authorized } = await requireAdmin()
  if (!authorized) {
    return {
      youtube: { connected: false },
      facebook: { connected: false },
      instagram: { connected: false },
      posts: [],
    }
  }

  const [youtube, facebook, instagram] = await Promise.all([
    getYouTubeStats(),
    getFacebookStats(),
    getInstagramStats(),
  ])

  return {
    youtube: youtube.meta,
    facebook: facebook.meta,
    instagram: instagram.meta,
    posts: [...youtube.posts, ...facebook.posts, ...instagram.posts],
  }
}
