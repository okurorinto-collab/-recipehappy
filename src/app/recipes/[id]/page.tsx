import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from '@/components/DeleteButton'
import FetchThumbnailButton from '@/components/FetchThumbnailButton'
import { parseItem } from '@/lib/utils'

function parseSteps(steps: string): string[] {
  // "。2. " のようなインライン番号を改行に正規化してから分割
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
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto">
      {/* ヘッダー画像 - 全幅・左右2px・4:3 */}
      <div className="relative mx-[2px] aspect-[4/3] bg-gradient-to-br from-green-100 to-green-200 overflow-hidden">
        {recipe.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <Link href="/recipes"
            className="bg-white/90 backdrop-blur-sm w-9 h-9 rounded-lg flex items-center justify-center text-gray-700 hover:bg-white transition">
            ←
          </Link>
          <div className="flex gap-2">
            {!recipe.thumbnail_url && <FetchThumbnailButton recipeId={recipe.id} title={recipe.title} sourceUrl={recipe.source_url} />}
            <Link href={`/recipes/${id}/edit`}
              className="bg-white/90 backdrop-blur-sm px-3 h-9 rounded-lg flex items-center text-sm font-medium text-gray-700 hover:bg-white transition">
              編集
            </Link>
            <DeleteButton id={id} />
          </div>
        </div>
      </div>

      {/* タイトル */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{recipe.title}</h1>
        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
            className="text-green-500 text-xs hover:underline">元のURL →</a>
        )}
      </div>

      {/* 食材・調味料 */}
      {(ingredients.length > 0 || seasonings.length > 0) && (
        <div className="px-4 py-4 border-b border-gray-100">
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

      {/* 作り方 */}
      {steps.length > 0 && (
        <div className="px-4 py-4 pb-12">
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
  )
}
