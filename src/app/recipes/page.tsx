import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RecipeList from '@/components/RecipeList'

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ ingredients?: string; category?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { ingredients: rawIngredients, category } = await searchParams
  const filterIngredients = rawIngredients
    ? rawIngredients.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const { data: recipes } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const userName = user.user_metadata?.full_name?.split(' ')[0]
    ?? user.email?.split('@')[0]
    ?? 'あなた'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto">
        {/* ヘッダー */}
        <div className="bg-white px-5 pt-8 pb-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-sm text-gray-400">こんにちは、{userName}さん</p>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">何を食べますか？</h1>
            </div>
            <Link href="/recipes/new"
              className="bg-green-500 text-white px-4 h-10 rounded-lg flex items-center gap-1 text-sm font-semibold hover:bg-green-600 transition flex-shrink-0 mt-1">
              <span className="text-lg leading-none">+</span> レシピを追加
            </Link>
          </div>
        </div>

        <RecipeList
          recipes={recipes ?? []}
          filterIngredients={filterIngredients}
          activeCategory={category ?? ''}
        />
      </div>
    </div>
  )
}
