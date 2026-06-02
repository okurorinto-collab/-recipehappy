import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth-check'
import { fetchPexelsThumbnail, fetchOgImage } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ url: null }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const sourceUrl = request.nextUrl.searchParams.get('sourceUrl') ?? ''

  // 1. 元ネタURLのog:imageを優先（SNSはスキップ）
  const skipDomains = ['instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'facebook.com']
  const isSns = skipDomains.some(d => sourceUrl.includes(d))

  if (sourceUrl && !isSns) {
    const ogImage = await fetchOgImage(sourceUrl)
    // ロゴっぽいURLは除外（rsrc.php など）
    if (ogImage && !ogImage.includes('rsrc.php') && !ogImage.includes('logo')) {
      return NextResponse.json({ url: ogImage })
    }
  }

  // 2. Pexelsでタイトル検索
  if (q) {
    const url = await fetchPexelsThumbnail(q)
    if (url) return NextResponse.json({ url })
  }

  return NextResponse.json({ url: null })
}
