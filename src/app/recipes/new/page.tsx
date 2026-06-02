'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AnalyzingLoader from '@/components/AnalyzingLoader'

type Extracted = {
  title: string
  ingredients: string[]
  seasonings: string[]
  steps: string
}

function parseItem(item: string) {
  const [name, amount] = item.split('|')
  return { name: name ?? item, amount: amount ?? '' }
}

export default function NewRecipePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const [error, setError] = useState('')

  const handleFile = (file: File) => {
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setExtracted(null)
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }

  const handleExtract = async () => {
    if (!image) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', image)
      const res = await fetch('/api/extract', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setExtracted(data)
      if (data.thumbnailUrl) setThumbnailUrl(data.thumbnailUrl)
    } catch {
      setError('抽出に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!extracted) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('recipes').insert({
      user_id: user.id,
      title: extracted.title,
      ingredients: extracted.ingredients,
      seasonings: extracted.seasonings,
      steps: extracted.steps,
      source_url: sourceUrl || null,
      thumbnail_url: thumbnailUrl || null,
    })

    if (error) { setError('保存に失敗しました'); setLoading(false); return }
    router.push('/recipes')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {loading && !extracted && <AnalyzingLoader />}
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">←</button>
          <h1 className="text-xl font-bold text-gray-800">レシピを追加</h1>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition mb-4 bg-white"
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-lg object-contain" />
          ) : (
            <div className="text-gray-400">
              <div className="text-4xl mb-2">📷</div>
              <p>スクショをここにドロップ<br />またはタップして選択</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>

        <input type="url" placeholder="元ネタURL（任意）" value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-3 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {extracted && (
          <div className="bg-white rounded-lg p-5 mb-4 shadow-sm space-y-4">
            <input className="text-lg font-bold w-full border-b border-gray-100 pb-2 focus:outline-none"
              value={extracted.title}
              onChange={(e) => setExtracted({ ...extracted, title: e.target.value })} />

            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">食材</p>
              <div className="space-y-1">
                {extracted.ingredients.map((ing, i) => {
                  const { name, amount } = parseItem(ing)
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-gray-800">{name}</span>
                      <span className="text-gray-500">{amount}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {extracted.seasonings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">調味料</p>
                <div className="space-y-1">
                  {extracted.seasonings.map((s, i) => {
                    const { name, amount } = parseItem(s)
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-gray-800">{name}</span>
                        <span className="text-gray-500">{amount}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">作り方</p>
              <textarea className="w-full text-sm text-gray-700 focus:outline-none resize-none" rows={5}
                value={extracted.steps}
                onChange={(e) => setExtracted({ ...extracted, steps: e.target.value })} />
            </div>
          </div>
        )}

        {!extracted ? (
          <button onClick={handleExtract} disabled={!image || loading}
            className="w-full bg-green-500 text-white font-semibold py-3 rounded-lg disabled:opacity-40 hover:bg-green-600 transition">
            {loading ? '解析中...' : 'AIで解析する'}
          </button>
        ) : (
          <button onClick={handleSave} disabled={loading}
            className="w-full bg-green-500 text-white font-semibold py-3 rounded-lg disabled:opacity-40 hover:bg-green-600 transition">
            {loading ? '保存中...' : '保存する'}
          </button>
        )}
      </div>
    </div>
  )
}
