import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RecipeList from '@/components/RecipeList'

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ ingredients?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { ingredients: rawIngredients } = await searchParams
  const filterIngredients = rawIngredients
    ? rawIngredients.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  let query = supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (filterIngredients.length > 0) {
    query = query.overlaps('ingredients', filterIngredients)
  }

  const { data: recipes } = await query

  // 全具材リスト（フィルター用）
  const { data: allRecipes } = await supabase
    .from('recipes')
    .select('ingredients')
    .eq('user_id', user.id)

  const allIngredients = Array.from(
    new Set((allRecipes ?? []).flatMap((r) => r.ingredients as string[]))
  ).sort()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-6 pt-2">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">My Recipes</p>
            <h1 className="text-2xl font-bold text-gray-900">レシピ帳</h1>
          </div>
          <Link
            href="/recipes/new"
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition"
          >
            ＋ 追加
          </Link>
        </div>

        <RecipeList
          recipes={recipes ?? []}
          allIngredients={allIngredients}
          filterIngredients={filterIngredients}
        />
      </div>
    </div>
  )
}
