'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('このレシピを削除しますか？')) return
    await supabase.from('recipes').delete().eq('id', id)
    router.push('/recipes')
  }

  return (
    <button onClick={handleDelete}
      className="bg-white/90 backdrop-blur-sm px-3 h-9 rounded-lg flex items-center text-sm font-medium text-red-400 shadow-sm hover:text-red-600 hover:bg-white transition">
      削除
    </button>
  )
}
