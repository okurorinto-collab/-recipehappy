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

function parseName(item: string) {
  return item.includes('|') ? item.split('|')[0] : item.split(/\s+/)[0]
}

export default function RecipeList({
  recipes,
  allIngredients,
  filterIngredients,
}: {
  recipes: Recipe[]
  allIngredients: string[]
  filterIngredients: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const toggleIngredient = (ing: string) => {
    const current = new Set(filterIngredients)
    if (current.has(ing)) current.delete(ing)
    else current.add(ing)
    const params = new URLSearchParams(searchParams.toString())
    if (current.size > 0) params.set('ingredients', Array.from(current).join(','))
    else params.delete('ingredients')
    router.push(`/recipes?${params.toString()}`)
  }

  return (
    <>
      {allIngredients.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">具材で絞り込み</p>
          <div className="flex flex-wrap gap-2">
            {allIngredients.map((ing) => (
              <button key={ing} onClick={() => toggleIngredient(ing)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                  filterIngredients.includes(ing)
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                }`}>
                {ing}
              </button>
            ))}
          </div>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="text-center text-gray-400 py-24">
          <div className="text-5xl mb-4">🍽</div>
          <p className="text-sm">{filterIngredients.length > 0 ? '該当するレシピがありません' : 'レシピをまだ登録していません'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden flex gap-0">
              {recipe.thumbnail_url ? (
                <img src={recipe.thumbnail_url} alt={recipe.title}
                  className="w-24 h-24 object-cover flex-shrink-0" />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 flex-shrink-0 flex items-center justify-center text-3xl">
                  🍳
                </div>
              )}
              <div className="p-4 flex flex-col justify-center">
                <h2 className="font-bold text-gray-800 mb-2 text-sm leading-snug">{recipe.title}</h2>
                <div className="flex flex-wrap gap-1">
                  {[...recipe.ingredients, ...(recipe.seasonings ?? [])].slice(0, 4).map((ing, i) => (
                    <span key={i} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">
                      {parseName(ing)}
                    </span>
                  ))}
                  {(recipe.ingredients.length + (recipe.seasonings?.length ?? 0)) > 4 && (
                    <span className="text-gray-400 text-xs px-1">...</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
