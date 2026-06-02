'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function FetchThumbnailButton({
  recipeId,
  title,
  sourceUrl,
}: {
  recipeId: string
  title: string
  sourceUrl?: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleFetch = async () => {
    setLoading(true)
    setNotFound(false)
    try {
      const params = new URLSearchParams({ q: title })
      if (sourceUrl) params.set('sourceUrl', sourceUrl)
      const res = await fetch(`/api/thumbnail-search?${params}`)
      const data = await res.json()
      if (data.url) {
        await supabase.from('recipes').update({ thumbnail_url: data.url }).eq('id', recipeId)
        router.refresh()
      } else {
        setNotFound(true)
        setTimeout(() => setNotFound(false), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFetch}
      disabled={loading}
      className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-3 h-9 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition disabled:opacity-40"
    >
      {loading ? '取得中...' : notFound ? '見つからず' : '🖼 画像を取得'}
    </button>
  )
}
