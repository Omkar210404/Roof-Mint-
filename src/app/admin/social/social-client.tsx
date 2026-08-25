'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Globe, Camera, Eye, ThumbsUp, MessageCircle, ArrowUp, ArrowDown, ExternalLink, Users } from 'lucide-react'
import type { SocialStats, SocialVideo } from './actions'

type SortKey = 'date' | 'views' | 'likes' | 'comments'
type SortDir = 'asc' | 'desc'

function StatChip({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <Icon className="w-3.5 h-3.5" />
      <span className="font-semibold text-navy dark:text-white">{value.toLocaleString('en-IN')}</span>
      {label}
    </div>
  )
}

function PlatformCard({ icon: Icon, name, iconClass, connected, children }: { icon: any; name: string; iconClass: string; connected: boolean; children?: React.ReactNode }) {
  return (
    <div className={`bg-white dark:bg-navy-900 border rounded-xl p-4 shadow-sm ${connected ? 'border-gray-100/60 dark:border-gray-800/60' : 'border-dashed border-gray-200 dark:border-gray-800'}`}>
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold text-navy dark:text-white">{name}</span>
        {!connected && (
          <span className="ml-auto text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Not connected
          </span>
        )}
      </div>
      {connected ? (
        <div className="mt-3 space-y-1.5">{children}</div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Add API credentials to bring this platform's stats in here.</p>
      )}
    </div>
  )
}

export function SocialClientWrapper({ initialStats }: { initialStats: SocialStats }) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedVideos = useMemo(() => {
    const videos = [...initialStats.youtube.videos]
    videos.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      else if (sortKey === 'views') cmp = a.views - b.views
      else if (sortKey === 'likes') cmp = a.likes - b.likes
      else cmp = a.comments - b.comments
      return sortDir === 'asc' ? cmp : -cmp
    })
    return videos
  }, [initialStats.youtube.videos, sortKey, sortDir])

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKeyVal)}
      className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-navy dark:hover:text-white transition-colors"
    >
      {label}
      {sortKey === sortKeyVal && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </button>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-navy dark:text-white">Social Performance</h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Reels and videos posted across Facebook, Instagram, and YouTube, in one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlatformCard icon={Play} name="YouTube" iconClass="bg-red-50 text-red-600" connected={initialStats.youtube.connected}>
          <StatChip icon={Users} value={initialStats.youtube.subscriberCount || 0} label="subscribers" />
          <StatChip icon={Eye} value={initialStats.youtube.totalViews || 0} label="channel views" />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-1">{initialStats.youtube.videos.length} video{initialStats.youtube.videos.length === 1 ? '' : 's'} tracked below</p>
        </PlatformCard>

        <PlatformCard icon={Globe} name="Facebook" iconClass="bg-blue-50 text-blue-600" connected={false} />
        <PlatformCard icon={Camera} name="Instagram" iconClass="bg-pink-50 text-pink-600" connected={false} />
      </div>

      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Reels & Videos</h2>
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-2.5 py-1 rounded-md">
            {sortedVideos.length} shown
          </span>
        </div>

        {sortedVideos.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
            {initialStats.youtube.connected ? 'No videos found on the connected channel yet.' : 'Nothing to show yet — connect a platform above.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800/60">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Content</th>
                  <th className="text-left px-3 py-3"><SortHeader label="Posted" sortKeyVal="date" /></th>
                  <th className="text-left px-3 py-3"><SortHeader label="Views" sortKeyVal="views" /></th>
                  <th className="text-left px-3 py-3"><SortHeader label="Likes" sortKeyVal="likes" /></th>
                  <th className="text-left px-3 py-3"><SortHeader label="Comments" sortKeyVal="comments" /></th>
                  <th className="text-right px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {sortedVideos.map((video: SocialVideo) => (
                  <tr key={video.id} className="hover:bg-gray-50/50 dark:hover:bg-navy-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 max-w-xs">
                        {video.thumbnail && (
                          <div className="relative w-16 h-10 rounded-md overflow-hidden shrink-0 bg-gray-100 dark:bg-navy-800">
                            <Image src={video.thumbnail} alt={video.title} fill className="object-cover" unoptimized />
                          </div>
                        )}
                        <span className="text-xs font-medium text-navy dark:text-white line-clamp-2">{video.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(video.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy dark:text-white">
                      <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-gray-400" /> {video.views.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy dark:text-white">
                      <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-gray-400" /> {video.likes.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy dark:text-white">
                      <span className="inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-gray-400" /> {video.comments.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={video.url} target="_blank" className="text-primary hover:text-teal-700 inline-flex items-center gap-1 text-xs font-medium">
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
