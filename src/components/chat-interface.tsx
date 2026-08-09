'use client'

import { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Bot, User, ArrowRight } from 'lucide-react'

export function ChatInterface() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat()

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl border-emerald-100 dark:border-emerald-900/30 overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
      <div className="bg-emerald-600 p-4 flex items-center gap-3">
        <div className="bg-white p-2 rounded-full">
          <Bot className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg leading-tight">AI Concierge</h2>
          <p className="text-emerald-100 text-xs">Always here to help you find your dream home</p>
        </div>
      </div>
      
      <ScrollArea className="h-[400px] p-4">
        <div className="space-y-6">
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
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' 
                    : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                
                <div className="flex flex-col gap-2">
                  {message.content && (
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                        message.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-tr-sm'
                          : 'bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                      }`}
                    >
                      {message.content}
                    </div>
                  )}

                  {/* Render Tool Invocations (Property Results) */}
                  {message.toolInvocations?.map((toolInvocation: any) => {
                    const { toolName, toolCallId, state } = toolInvocation;

                    if (state === 'result' && toolName === 'extract_filters') {
                      const properties = toolInvocation.result;
                      
                      return (
                        <div key={toolCallId} className="space-y-3 mt-2">
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
                                <Link key={property.id} href={`/properties/${property.slug}`}>
                                  <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex group">
                                    <div className="w-24 bg-emerald-50 dark:bg-emerald-900/20 flex-shrink-0 flex items-center justify-center">
                                      <span className="text-xs text-emerald-600/50 font-medium">Image</span>
                                    </div>
                                    <div className="p-3 flex-1 flex flex-col justify-between">
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
                    
                    // Show a loading state for the tool call
                    if (state !== 'result') {
                      return (
                        <div key={toolCallId} className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl text-sm text-gray-500 flex items-center gap-2 animate-pulse">
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          Searching database...
                        </div>
                      )
                    }
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
             <div className="flex justify-start">
               <div className="flex gap-3 max-w-[85%] flex-row">
                 <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                 </div>
                 <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                 </div>
               </div>
             </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-gray-50 dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 relative"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g. 2BHK in South Mumbai under 5 Cr..."
            className="flex-1 pr-24 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 focus-visible:ring-emerald-600 rounded-full h-12 shadow-sm"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="absolute right-1 rounded-full h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            Send
          </Button>
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
           <Badge variant="outline" className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 whitespace-nowrap" onClick={() => setInput('Show me villas in North area')}>Villa in North</Badge>
           <Badge variant="outline" className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 whitespace-nowrap" onClick={() => setInput('3BHK under 1.5 Cr')}>3BHK &lt; 1.5 Cr</Badge>
           <Badge variant="outline" className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 whitespace-nowrap" onClick={() => setInput('Commercial spaces')}>Commercial</Badge>
        </div>
      </div>
    </Card>
  )
}
