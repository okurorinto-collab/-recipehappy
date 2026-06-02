'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseItem, formatItem } from '@/lib/utils'

type Item = { name: string; amount: string }

export default function EditRecipePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState<Item[]>([])
  const [seasonings, setSeasonings] = useState<Item[]>([])
  const [steps, setSteps] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fetchingThumb, setFetchingThumb] = useState(false)

  useEffect(() => {
    supabase.from('recipes').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return
      setTitle(data.title)
      setIngredients((data.ingredients as string[]).map(parseItem))
      setSeasonings((data.seasonings as string[] ?? []).map(parseItem))
      setSteps(data.steps ?? '')
      setSourceUrl(data.source_url ?? '')
      const thumb = data.thumbnail_url ?? ''
      setThumbnailUrl(thumb)
      setLoading(false)

      // サムネイルが空なら自動取得
      if (!thumb) {
        const params = new URLSearchParams({ q: data.title })
        if (data.source_url) params.set('sourceUrl', data.source_url)
        fetch(`/api/thumbnail-search?${params}`)
          .then(r => r.json())
          .then(d => { if (d.url) setThumbnailUrl(d.url) })
          .catch(() => {})
      }
    })
  }, [id])

  const updateItem = (list: Item[], setList: (l: Item[]) => void, i: number, field: 'name' | 'amount', val: string) => {
    const next = [...list]
    next[i] = { ...next[i], [field]: val }
    setList(next)
  }

  const removeItem = (list: Item[], setList: (l: Item[]) => void, i: number) => {
    setList(list.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error } = await supabase.from('recipes').update({
      title,
      ingredients: ingredients.map((i) => formatItem(i.name, i.amount)),
      seasonings: seasonings.map((i) => formatItem(i.name, i.amount)),
      steps,
      source_url: sourceUrl || null,
      thumbnail_url: thumbnailUrl || null,
    }).eq('id', id)

    if (error) { setError('保存に失敗しました'); setSaving(false); return }
    router.push(`/recipes/${id}`)
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>

  const ItemList = ({ list, setList, label }: { list: Item[]; setList: (l: Item[]) => void; label: string }) => (
    <div>
      <p className="text-xs font-semibold text-gray-400 mb-2">{label}</p>
      <div className="space-y-2">
        {list.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input className="font-bold text-sm border-b border-gray-200 focus:outline-none flex-1 pb-1"
              value={item.name} placeholder="名前"
              onChange={(e) => updateItem(list, setList, i, 'name', e.target.value)} />
            <input className="text-sm text-gray-500 border-b border-gray-200 focus:outline-none w-24 pb-1"
              value={item.amount} placeholder="量"
              onChange={(e) => updateItem(list, setList, i, 'amount', e.target.value)} />
            <button onClick={() => removeItem(list, setList, i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
          </div>
        ))}
        <button onClick={() => setList([...list, { name: '', amount: '' }])}
          className="text-green-500 text-sm hover:text-green-600">＋ 追加</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← 戻る</button>
          <button onClick={handleSave} disabled={saving}
            className="bg-green-500 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-green-600 transition">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>

        <div className="bg-white rounded-lg p-6  space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">タイトル</p>
            <input className="text-xl font-bold w-full focus:outline-none border-b border-gray-100 pb-2"
              value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">元ネタURL</p>
            <input type="url" className="w-full text-sm border-b border-gray-200 focus:outline-none pb-1 text-gray-700"
              value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-400">サムネイル画像URL</p>
              <button
                onClick={async () => {
                  setFetchingThumb(true)
                  try {
                    const params = new URLSearchParams({ q: title })
                    if (sourceUrl) params.set('sourceUrl', sourceUrl)
                    const r = await fetch(`/api/thumbnail-search?${params}`)
                    const data = await r.json()
                    if (data.url) setThumbnailUrl(data.url)
                  } finally {
                    setFetchingThumb(false)
                  }
                }}
                disabled={fetchingThumb}
                className="text-xs text-green-600 hover:text-green-700 disabled:opacity-40">
                {fetchingThumb ? '取得中...' : '🔍 自動取得'}
              </button>
            </div>
            <input type="url" className="w-full text-sm border-b border-gray-200 focus:outline-none pb-1 text-gray-700"
              value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="Google画像検索などから貼り付け" />
            {thumbnailUrl && (
              <img src={thumbnailUrl} alt="preview" className="mt-2 h-24 rounded-lg object-cover"
                onError={async (e) => {
                  e.currentTarget.style.display = 'none'
                  // 自動で別のURLを探す
                  setFetchingThumb(true)
                  try {
                    const params = new URLSearchParams({ q: title })
                    if (sourceUrl) params.set('sourceUrl', sourceUrl)
                    const r = await fetch(`/api/thumbnail-search?${params}`)
                    const data = await r.json()
                    if (data.url) setThumbnailUrl(data.url)
                  } finally {
                    setFetchingThumb(false)
                  }
                }} />
            )}
            {fetchingThumb && <p className="text-xs text-green-600 mt-1">別の画像を探しています...</p>}
          </div>

          <ItemList list={ingredients} setList={setIngredients} label="食材" />
          <ItemList list={seasonings} setList={setSeasonings} label="調味料" />

          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">作り方</p>
            <textarea className="w-full text-sm text-gray-700 focus:outline-none resize-none leading-relaxed" rows={8}
              value={steps} onChange={(e) => setSteps(e.target.value)} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  )
}
