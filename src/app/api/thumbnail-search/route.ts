import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth-check'
import { fetchPexelsThumbnail, fetchOgImage, fetchWikipediaImage } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    console.error('[thumbnail-search] 認証失敗')
    return NextResponse.json({ url: null }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const sourceUrl = request.nextUrl.searchParams.get('sourceUrl') ?? ''
  console.log('[thumbnail-search] start q:', q, 'sourceUrl:', sourceUrl)

  // 1. 元ネタURLのog:imageを優先（SNSはスキップ）
  const skipDomains = ['instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'facebook.com']
  const isSns = skipDomains.some(d => sourceUrl.includes(d))

  if (sourceUrl && !isSns) {
    const ogImage = await fetchOgImage(sourceUrl)
    console.log('[thumbnail-search] ogImage:', ogImage)
    if (ogImage && !ogImage.includes('rsrc.php') && !ogImage.includes('logo')) {
      return NextResponse.json({ url: ogImage })
    }
  }

  // 2. Pexelsでタイトル検索（APIキーが設定されている場合）
  if (q && process.env.PEXELS_API_KEY) {
    const url = await fetchPexelsThumbnail(q)
    console.log('[thumbnail-search] pexels:', url)
    if (url) return NextResponse.json({ url })
  }

  // 3. Wikipedia（認証不要・無料フォールバック）
  if (q) {
    const url = await fetchWikipediaImage(q)
    console.log('[thumbnail-search] wikipedia:', url)
    if (url) return NextResponse.json({ url })
  }

  console.log('[thumbnail-search] 全ソース失敗')
  return NextResponse.json({ url: null })
}
