'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Play, Globe, Camera, Eye, ThumbsUp, MessageCircle, ArrowUp, ArrowDown, ExternalLink, Users, FileText, LayoutGrid } from 'lucide-react'
import type { SocialStats, SocialPost } from './actions'

type SortKey = 'date' | 'views' | 'likes' | 'comments'
type SortDir = 'asc' | 'desc'
type ActiveView = 'overall' | SocialPost['platform']

const PLATFORM_META: Record<SocialPost['platform'], { label: string; icon: any; iconClass: string; chartColor: string }> = {
  youtube: { label: 'YouTube', icon: Play, iconClass: 'bg-red-50 text-red-600', chartColor: '#dc2626' },
  facebook: { label: 'Facebook', icon: Globe, iconClass: 'bg-blue-50 text-blue-600', chartColor: '#2563eb' },
  instagram: { label: 'Instagram', icon: Camera, iconClass: 'bg-pink-50 text-pink-600', chartColor: '#db2777' },
}

function StatChip({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <Icon className="w-3.5 h-3.5" />
      <span className="font-semibold text-navy dark:text-white">{value.toLocaleString('en-IN')}</span>
      {label}
    </div>
  )
}

function PlatformCard({ icon: Icon, name, iconClass, connected, active, onClick, children }: {
  icon: any; name: string; iconClass: string; connected: boolean; active: boolean; onClick: () => void; children?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white dark:bg-navy-900 border rounded-xl p-4 shadow-sm transition-all ${
        active ? 'border-primary ring-2 ring-primary/20' : connected ? 'border-gray-100/60 dark:border-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700' : 'border-dashed border-gray-200 dark:border-gray-800'
      }`}
    >
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
    </button>
  )
}

export function SocialClientWrapper({ initialStats }: { initialStats: SocialStats }) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [activeView, setActiveView] = useState<ActiveView>('overall')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const togglePlatform = (platform: SocialPost['platform']) => {
    setActiveView(prev => (prev === platform ? 'overall' : platform))
  }

  const sortedPosts = useMemo(() => {
    const posts = activeView === 'overall' ? [...initialStats.posts] : initialStats.posts.filter(p => p.platform === activeView)
    posts.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      else if (sortKey === 'views') cmp = (a.views ?? -1) - (b.views ?? -1)
      else if (sortKey === 'likes') cmp = a.likes - b.likes
      else cmp = a.comments - b.comments
      return sortDir === 'asc' ? cmp : -cmp
    })
    return posts
  }, [initialStats.posts, activeView, sortKey, sortDir])

  // Overall view: engagement (likes+comments) share per platform.
  // Per-platform view: that platform's own likes vs comments split.
  const chartData = useMemo(() => {
    if (activeView === 'overall') {
      return (['youtube', 'facebook', 'instagram'] as const)
        .map(platform => {
          const posts = initialStats.posts.filter(p => p.platform === platform)
          const engagement = posts.reduce((sum, p) => sum + p.likes + p.comments, 0)
          return { name: PLATFORM_META[platform].label, value: engagement, color: PLATFORM_META[platform].chartColor }
        })
        .filter(d => d.value > 0)
    }
    const posts = initialStats.posts.filter(p => p.platform === activeView)
    const likes = posts.reduce((sum, p) => sum + p.likes, 0)
    const comments = posts.reduce((sum, p) => sum + p.comments, 0)
    return [
      { name: 'Likes', value: likes, color: '#0d9488' },
      { name: 'Comments', value: comments, color: '#6366f1' },
    ].filter(d => d.value > 0)
  }, [initialStats.posts, activeView])

  const totalEngagement = chartData.reduce((sum, d) => sum + d.value, 0)

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
        <PlatformCard icon={Play} name="YouTube" iconClass="bg-red-50 text-red-600" connected={initialStats.youtube.connected} active={activeView === 'youtube'} onClick={() => togglePlatform('youtube')}>
          <StatChip icon={Users} value={initialStats.youtube.subscriberCount || 0} label="subscribers" />
          <StatChip icon={Eye} value={initialStats.youtube.totalViews || 0} label="channel views" />
        </PlatformCard>

        <PlatformCard icon={Globe} name="Facebook" iconClass="bg-blue-50 text-blue-600" connected={initialStats.facebook.connected} active={activeView === 'facebook'} onClick={() => togglePlatform('facebook')}>
          <StatChip icon={Users} value={initialStats.facebook.followerCount || 0} label="followers" />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-1">{initialStats.facebook.pageName}</p>
        </PlatformCard>

        <PlatformCard icon={Camera} name="Instagram" iconClass="bg-pink-50 text-pink-600" connected={initialStats.instagram.connected} active={activeView === 'instagram'} onClick={() => togglePlatform('instagram')}>
          <StatChip icon={Users} value={initialStats.instagram.followerCount || 0} label="followers" />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-1">@{initialStats.instagram.username} · {initialStats.instagram.mediaCount || 0} posts</p>
        </PlatformCard>
      </div>

      {/* Engagement Breakdown — donut chart, same style as the Business Admin
          dashboard's Property Status chart. Clicking a platform card above
          drills into that platform's own likes/comments split; click it
          again (or nothing selected) to return to the cross-platform view. */}
      <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">
            {activeView === 'overall' ? 'Engagement by Platform' : `${PLATFORM_META[activeView].label} — Likes vs Comments`}
          </h2>
          {activeView !== 'overall' && (
            <button
              onClick={() => setActiveView('overall')}
              className="text-xs font-semibold text-primary hover:text-teal-700 inline-flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> View overall
            </button>
          )}
        </div>

        {chartData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">No engagement data yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <p className="text-2xl font-bold text-navy dark:text-white">{totalEngagement.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">total engagement (likes + comments) {activeView === 'overall' ? 'across all platforms' : `on ${PLATFORM_META[activeView].label}`}</p>
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{item.name}</span>
                  <span className="text-xs font-bold text-navy dark:text-white ml-auto">{item.value.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Reels & Posts</h2>
          <div className="flex items-center gap-2">
            <select
              value={activeView}
              onChange={e => setActiveView(e.target.value as ActiveView)}
              className="h-8 px-2 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="overall">All Platforms</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-2.5 py-1 rounded-md whitespace-nowrap">
              {sortedPosts.length} shown
            </span>
          </div>
        </div>

        {sortedPosts.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
            Nothing to show yet — connect a platform above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800/60">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Content</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Platform</th>
                  <th className="text-left px-3 py-3"><SortHeader label="Posted" sortKeyVal="date" /></th>
                  <th className="text-left px-3 py-3"><SortHeader label="Views" sortKeyVal="views" /></th>
                  <th className="text-left px-3 py-3"><SortHeader label="Likes" sortKeyVal="likes" /></th>
                  <th className="text-left px-3 py-3"><SortHeader label="Comments" sortKeyVal="comments" /></th>
                  <th className="text-right px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {sortedPosts.map((post: SocialPost) => (
                  <tr key={`${post.platform}-${post.id}`} className="hover:bg-gray-50/50 dark:hover:bg-navy-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 max-w-xs">
                        {post.thumbnail ? (
                          <div className="relative w-16 h-10 rounded-md overflow-hidden shrink-0 bg-gray-100 dark:bg-navy-800">
                            <Image src={post.thumbnail} alt={post.title} fill className="object-cover" unoptimized />
                          </div>
                        ) : (
                          <div className="w-16 h-10 rounded-md shrink-0 bg-gray-100 dark:bg-navy-800 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                        <span className="text-xs font-medium text-navy dark:text-white line-clamp-2">{post.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${PLATFORM_META[post.platform].iconClass}`}>
                        {PLATFORM_META[post.platform].label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy dark:text-white">
                      {post.views !== null ? (
                        <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-gray-400" /> {post.views.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy dark:text-white">
                      <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-gray-400" /> {post.likes.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy dark:text-white">
                      <span className="inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-gray-400" /> {post.comments.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={post.url} target="_blank" className="text-primary hover:text-teal-700 inline-flex items-center gap-1 text-xs font-medium">
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
