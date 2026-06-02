import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth-check'
import { fetchPexelsThumbnail, fetchOgImage } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ url: null }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const sourceUrl = request.nextUrl.searchParams.get('sourceUrl') ?? ''

  // 1. 元ネタURLのog:imageを優先
  if (sourceUrl) {
    const ogImage = await fetchOgImage(sourceUrl)
    if (ogImage) return NextResponse.json({ url: ogImage })
  }

  // 2. Pexelsでタイトル検索
  if (q) {
    const url = await fetchPexelsThumbnail(q)
    if (url) return NextResponse.json({ url })
  }

  return NextResponse.json({ url: null })
}
