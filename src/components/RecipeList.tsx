'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Recipe = {
  id: string
  title: string
  ingredients: string[]
  seasonings: string[]
  thumbnail_url: string | null
  created_at: string
}

const CATEGORIES = [
  { key: 'all', label: 'すべて', icon: null, svg: '/icon_Dish.svg' },
  { key: 'gattsu', label: 'ガッツリ', icon: null, svg: '/icon_meet.svg' },
  { key: 'assari', label: 'あっさり', icon: null, svg: '/icon_salad.svg' },
  { key: 'jitan', label: '時短', icon: '⚡', svg: null },
  { key: 'oyatsu', label: 'おやつ', icon: null, svg: '/icon_cake.svg' },
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  gattsu: ['豚', '鶏', '牛', '肉', 'ひき肉', 'ベーコン', 'ソーセージ', '豚バラ', 'から揚げ'],
  assari: ['野菜', '豆腐', '魚', 'サラダ', 'きゅうり', 'トマト', '鮭', 'たら', 'わかめ'],
  jitan: ['卵', '豆腐', '缶', 'ツナ', 'チーズ', 'もやし', '冷凍'],
  oyatsu: ['砂糖', '小麦粉', 'チョコ', 'バター', 'ホットケーキ', '生クリーム', 'はちみつ'],
}

function matchesCategory(recipe: Recipe, category: string): boolean {
  if (!category || category === 'all') return true
  const keywords = CATEGORY_KEYWORDS[category] ?? []
  const allItems = [...recipe.ingredients, ...(recipe.seasonings ?? [])].map(i =>
    i.includes('|') ? i.split('|')[0] : i
  )
  return keywords.some(kw => allItems.some(i => i.includes(kw)) || recipe.title.includes(kw))
}

export default function RecipeList({
  recipes,
  filterIngredients,
  activeCategory,
}: {
  recipes: Recipe[]
  filterIngredients: string[]
  activeCategory: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setCategory = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'all') params.delete('category')
    else params.set('category', key)
    router.push(`/recipes?${params.toString()}`)
  }

  const filtered = recipes.filter(r => matchesCategory(r, activeCategory))

  return (
    <div>
      {/* カテゴリータブ */}
      <div className="flex gap-3 px-5 py-4 overflow-x-auto no-scrollbar bg-white border-b border-gray-100">
        {CATEGORIES.map((cat) => {
          const isActive = (activeCategory === cat.key) || (cat.key === 'all' && !activeCategory)
          return (
            <button key={cat.key} onClick={() => setCategory(cat.key)}
              className={`flex flex-col items-center gap-1 flex-shrink-0 transition ${isActive ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl ${isActive ? 'bg-green-500' : 'bg-gray-100'}`}>
                {cat.svg
                  ? <img src={cat.svg} alt={cat.label} className="w-8 h-8" />
                  : cat.icon}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* レシピグリッド */}
      <div className="px-4 pt-4 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <img src="/recipe_none.svg" alt="レシピなし" className="w-32 h-32 opacity-60" />
            <div className="text-center">
              <p className="font-bold text-gray-700 text-lg">レシピがありません</p>
              <p className="text-gray-400 text-sm mt-1">レシピを追加してください</p>
            </div>
            <a href="/recipes/new"
              className="bg-green-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-600 transition">
              レシピを作成する
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}
                className="bg-white rounded-lg  overflow-hidden hover: transition">
                <div className="relative w-full aspect-square bg-gradient-to-br from-green-100 to-green-200">
                  {recipe.thumbnail_url ? (
                    <img src={recipe.thumbnail_url} alt={recipe.title}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍳</div>
                  )}
                </div>
                <div className="p-3">
                  <h2 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{recipe.title}</h2>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
