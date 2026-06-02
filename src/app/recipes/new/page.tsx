'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AnalyzingLoader from '@/components/AnalyzingLoader'
import { parseItem } from '@/lib/utils'

const CATEGORIES = [
  { key: 'gattsu', label: 'ガッツリ', icon: '🍖' },
  { key: 'assari', label: 'あっさり', icon: '🥗' },
  { key: 'jitan', label: '時短', icon: '⚡' },
  { key: 'oyatsu', label: 'おやつ', icon: '🍰' },
  { key: 'other', label: 'その他', icon: '🍽' },
]

type Extracted = {
  title: string
  ingredients: string[]
  seasonings: string[]
  steps: string
  category: string
}

export default function NewRecipePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [sourceUrl, setSourceUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const [error, setError] = useState('')
  const [mismatch, setMismatch] = useState<{ message: string; imageResult: Extracted; urlResult: Extracted } | null>(null)
  const [urlCheck, setUrlCheck] = useState<{ ok: boolean; message: string } | null>(null)
  const [urlChecking, setUrlChecking] = useState(false)

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    setImages(prev => [...prev, ...arr])
    setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))])
    setExtracted(null)
    setError('')
  }

  const removeImage = (i: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleExtract = async (overrideResult?: Extracted) => {
    if (overrideResult) { setExtracted(overrideResult); setMismatch(null); return }
    if (images.length === 0 && !sourceUrl) return
    setLoading(true)
    setError('')
    setMismatch(null)
    try {
      const formData = new FormData()
      images.forEach(f => formData.append('images', f))
      if (sourceUrl) formData.append('sourceUrl', sourceUrl)
      const res = await fetch('/api/extract', { method: 'POST', body: formData })
      const data = await res.json()

      if (res.status === 409 && data.error === 'mismatch') {
        setMismatch(data)
        return
      }
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
      category: extracted.category || 'other',
      source_url: sourceUrl || null,
      thumbnail_url: thumbnailUrl || null,
    })

    if (error) { setError('保存に失敗しました'); setLoading(false); return }
    router.push('/recipes')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {loading && !extracted && <AnalyzingLoader />}

      {/* 不一致ポップアップ */}
      {mismatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-800 mb-2">⚠️ レシピが一致しません</h3>
            <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{mismatch.message}</p>
            <div className="flex gap-2">
              <button onClick={() => handleExtract(mismatch.imageResult)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-semibold">
                スクショを使う
              </button>
              <button onClick={() => handleExtract(mismatch.urlResult)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold">
                URLを使う
              </button>
            </div>
            <button onClick={() => setMismatch(null)} className="w-full mt-2 text-gray-400 text-sm">キャンセル</button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">←</button>
          <h1 className="text-xl font-bold text-gray-800">レシピを追加</h1>
        </div>

        {/* 複数画像アップロード */}
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            {previews.map((p, i) => (
              <div key={i} className="relative w-24 h-24">
                <img src={p} alt="" className="w-full h-full object-cover rounded-lg" />
                <button onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ))}
            <div onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 border-2 border-dashed border-green-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition text-gray-400">
              <div className="text-2xl">📷</div>
              <div className="text-xs mt-1">追加</div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files) }} />
        </div>

        <div className="mb-4">
          <input type="url" placeholder="レシピのURLを貼ってください（任意）" value={sourceUrl}
            onChange={(e) => { setSourceUrl(e.target.value); setUrlCheck(null) }}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          {sourceUrl && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={async () => {
                  setUrlChecking(true)
                  setUrlCheck(null)
                  const res = await fetch(`/api/check-url?url=${encodeURIComponent(sourceUrl)}`)
                  const data = await res.json()
                  setUrlCheck(data)
                  setUrlChecking(false)
                }}
                disabled={urlChecking}
                className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition disabled:opacity-40">
                {urlChecking ? '確認中...' : 'URLを確認する'}
              </button>
              {urlCheck && (
                <p className={`text-xs ${urlCheck.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {urlCheck.ok ? '✓' : '✗'} {urlCheck.message}
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {extracted && (
          <div className="bg-white rounded-lg p-5 mb-4  space-y-4">
            <input className="text-lg font-bold w-full border-b border-gray-100 pb-2 focus:outline-none"
              value={extracted.title}
              onChange={(e) => setExtracted({ ...extracted, title: e.target.value })} />

            {/* カテゴリ選択 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">カテゴリ</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button key={cat.key} onClick={() => setExtracted({ ...extracted, category: cat.key })}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${extracted.category === cat.key ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

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
          <button onClick={() => handleExtract()}
            disabled={(images.length === 0 && !sourceUrl) || loading}
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
