import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth-check'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ ok: false, message: '認証が必要です' }, { status: 401 })

  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ ok: false, message: 'URLを入力してください' })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, message: `ページを取得できません (${res.status})` })
    }

    const html = await res.text()
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    const recipeKeywords = ['材料', '作り方', '手順', 'ingredients', 'instructions', 'recipe', 'レシピ', '小さじ', '大さじ']
    const found = recipeKeywords.filter(kw => text.toLowerCase().includes(kw.toLowerCase()))

    if (found.length >= 2) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = titleMatch?.[1]?.trim() ?? 'タイトル不明'
      return NextResponse.json({ ok: true, message: `レシピ情報を取得できそうです「${title.slice(0, 30)}」` })
    } else {
      return NextResponse.json({ ok: false, message: 'このURLからレシピ情報を取得できませんでした（InstagramなどのSNSは非対応）' })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('timeout') || msg.includes('abort')) {
      return NextResponse.json({ ok: false, message: 'タイムアウト：ページの読み込みに時間がかかりすぎています' })
    }
    return NextResponse.json({ ok: false, message: 'URLにアクセスできませんでした' })
  }
}
