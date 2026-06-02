import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from '@/components/DeleteButton'
import FetchThumbnailButton from '@/components/FetchThumbnailButton'
import { parseItem } from '@/lib/utils'

function parseSteps(steps: string): string[] {
  const normalized = steps.replace(/([。．])\s*\d+[.．]\s+/g, '$1\n')
  return normalized
    .split(/\n|①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩/)
    .map(s => s.replace(/^[\d\s．.、。]+/, '').trim())
    .filter(Boolean)
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')

  const { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!recipe) notFound()

  const ingredients = (recipe.ingredients as string[]) ?? []
  const seasonings = (recipe.seasonings as string[]) ?? []
  const steps = recipe.steps ? parseSteps(recipe.steps) : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビバー */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/recipes" className="text-gray-500 hover:text-gray-700 text-sm">← 一覧へ</Link>
        <div className="flex gap-2">
          {!recipe.thumbnail_url && <FetchThumbnailButton recipeId={recipe.id} title={recipe.title} sourceUrl={recipe.source_url} />}
          <Link href={`/recipes/${id}/edit`}
            className="bg-gray-100 px-3 h-8 rounded-lg flex items-center text-sm font-medium text-gray-700 hover:bg-gray-200 transition">
            編集
          </Link>
          <DeleteButton id={id} />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* PC: 2カラム / SP: 1カラム */}
        <div className="md:grid md:grid-cols-2 md:gap-8">

          {/* 左: 画像 + タイトル */}
          <div>
            <div className="relative w-full aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded-lg overflow-hidden mb-4">
              {recipe.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{recipe.title}</h1>
            {recipe.source_url && (
              <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
                className="text-green-500 text-xs hover:underline">元のURL →</a>
            )}

            {/* PC時: 材料を左カラムに */}
            {(ingredients.length > 0 || seasonings.length > 0) && (
              <div className="mt-6 bg-white rounded-lg p-5">
                <h2 className="font-bold text-gray-800 mb-3">材料</h2>
                {ingredients.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">食材</p>
                    <div className="divide-y divide-gray-100">
                      {ingredients.map((ing, i) => {
                        const { name, amount } = parseItem(ing)
                        return (
                          <div key={i} className="flex justify-between items-center py-2">
                            <span className="font-semibold text-gray-800 text-sm">{name}</span>
                            <span className="text-gray-500 text-sm">{amount}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {seasonings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">調味料</p>
                    <div className="divide-y divide-gray-100">
                      {seasonings.map((s, i) => {
                        const { name, amount } = parseItem(s)
                        return (
                          <div key={i} className="flex justify-between items-center py-2">
                            <span className="font-semibold text-gray-800 text-sm">{name}</span>
                            <span className="text-gray-500 text-sm">{amount}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右: 作り方 */}
          <div>
            {steps.length > 0 && (
              <div className="bg-white rounded-lg p-5">
                <h2 className="font-bold text-gray-800 mb-3">作り方</h2>
                <div className="divide-y divide-gray-100">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 py-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-400 flex items-center justify-center text-xs font-bold text-green-500">
                        {i + 1}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
