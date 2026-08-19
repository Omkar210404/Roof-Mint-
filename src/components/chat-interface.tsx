'use client'

import { useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Bot, User, ArrowRight, Home, Building2, IndianRupee } from 'lucide-react'

const STARTER_PROMPTS = [
  { label: 'Homes in Whitefield', icon: Home, text: 'Show me homes in Whitefield' },
  { label: '2BHK under 80L', icon: IndianRupee, text: '2BHK under 80 lakhs' },
  { label: 'Villas in North', icon: Building2, text: 'Show me villas in North area' },
  { label: 'Commercial spaces', icon: Building2, text: 'Commercial spaces' },
]

export function ChatInterface({ onNavigate }: { onNavigate?: () => void } = {}) {
  const [input, setInput] = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const { messages, sendMessage, status, error, stop } = useChat()

  const isLoading = status === 'submitted' || status === 'streaming'

  // Safety net: if a request just hangs (slow model response, function
  // killed mid-stream by the platform's execution limit, dropped
  // connection — none of which necessarily surface as a clean `error`),
  // don't leave the user staring at nothing forever.
  useEffect(() => {
    if (!isLoading) return
    setTimedOut(false)
    const timer = setTimeout(() => {
      stop()
      setTimedOut(true)
    }, 25000)
    return () => clearTimeout(timer)
  }, [isLoading, stop])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    setTimedOut(false)
    sendMessage({ text: input })
    setInput('')
  }

  const sendPrompt = (text: string) => {
    if (isLoading) return
    setTimedOut(false)
    sendMessage({ text })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto h-full md:h-auto flex flex-col shadow-2xl border-emerald-100 dark:border-emerald-900/30 overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
      <div className="bg-emerald-600 p-4 flex items-center gap-3 shrink-0">
        <div className="bg-white rounded-full w-10 h-10 shrink-0 overflow-hidden">
          <Image src="/images/roofmintai.png" alt="" width={40} height={40} className="w-full h-full object-contain p-0.5" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg leading-tight">AI Concierge</h2>
          <p className="text-emerald-100 text-xs">Always here to help you find your dream home</p>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 md:h-[400px] md:flex-none p-4">
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-6 gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 overflow-hidden">
                <Image src="/images/roofmintai.png" alt="" width={56} height={56} className="w-full h-full object-contain p-1.5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100">Tell me what you&apos;re looking for</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">e.g. &quot;2BHK in South Mumbai under 5 Cr&quot; — I&apos;ll search and show you real listings.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => sendPrompt(p.text)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors text-left"
                  >
                    <p.icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message: any) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex gap-3 max-w-[85%] ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
                  message.role === 'user'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-zinc-800'
                }`}>
                  {message.role === 'user'
                    ? <User className="w-5 h-5" />
                    : <Image src="/images/roofmintai.png" alt="" width={32} height={32} className="w-full h-full object-contain p-0.5" />}
                </div>
                
                <div className="flex flex-col gap-2">
                  {message.parts?.map((part: any, partIdx: number) => {
                    if (part.type === 'text' && part.text) {
                      return (
                        <div
                          key={partIdx}
                          className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                            message.role === 'user'
                              ? 'bg-emerald-600 text-white rounded-tr-sm'
                              : 'bg-white dark:bg-zinc-800 border border-gray-100/60 dark:border-zinc-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                          }`}
                        >
                          {part.text}
                        </div>
                      )
                    }

                    if (part.type === 'tool-extract_filters') {
                      if (part.state === 'output-available') {
                        const properties = part.output?.properties ?? []

                        return (
                          <div key={partIdx} className="space-y-3 mt-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
                              Found {properties.length} matches
                            </p>
                            <div className="flex flex-col gap-3">
                              {properties.length === 0 ? (
                                <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl text-sm text-gray-500 border border-dashed">
                                  No exact matches found for your criteria. Try broadening your search!
                                </div>
                              ) : (
                                properties.map((property: any) => (
                                  <Link key={property.id} href={`/properties/${property.slug}`} onClick={() => onNavigate?.()}>
                                    <div className="bg-white dark:bg-zinc-800 border border-gray-100/60 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex group">
                                      <div className="relative w-24 shrink-0 bg-emerald-50 dark:bg-emerald-900/20">
                                        <Image
                                          src={property.cover_image || '/images/property1.png'}
                                          alt={property.title}
                                          fill
                                          sizes="96px"
                                          className="object-cover"
                                        />
                                      </div>
                                      <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                            {property.title}
                                          </h4>
                                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{property.location_address}</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-2">
                                          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                            ₹{property.price.toLocaleString()}
                                          </p>
                                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      }

                      if (part.state === 'output-error') {
                        return (
                          <div key={partIdx} className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
                            Couldn&apos;t search properties right now — try again in a moment.
                          </div>
                        )
                      }

                      // input-streaming / input-available — still working on the search
                      return (
                        <div key={partIdx} className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl text-sm text-gray-500 flex items-center gap-2 animate-pulse">
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          Searching database...
                        </div>
                      )
                    }

                    return null
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
             <div className="flex justify-start">
               <div className="flex gap-3 max-w-[85%] flex-row">
                 <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                    <Image src="/images/roofmintai.png" alt="" width={32} height={32} className="w-full h-full object-contain p-0.5" />
                 </div>
                 <div className="bg-white dark:bg-zinc-800 border border-gray-100/60 dark:border-zinc-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                 </div>
               </div>
             </div>
          )}
          {(error || timedOut) && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%] flex-row">
                <div className="shrink-0 w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-sm">
                  {timedOut
                    ? "That's taking longer than it should — please try again."
                    : 'Something went wrong on my end — please try that again in a moment.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-gray-50 dark:bg-zinc-950 border-t border-gray-100/60 dark:border-zinc-800 shrink-0 safe-area-bottom">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 relative"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g. 2BHK in South Mumbai under 5 Cr..."
            className="flex-1 pr-24 bg-white dark:bg-zinc-900 border-gray-200/60 dark:border-zinc-700 focus-visible:ring-emerald-600 rounded-full h-12 shadow-sm"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="absolute right-1 rounded-full h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            Send
          </Button>
        </form>
        {messages.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STARTER_PROMPTS.map((p) => (
              <Badge
                key={p.label}
                variant="outline"
                className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 whitespace-nowrap"
                onClick={() => sendPrompt(p.text)}
              >
                {p.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
