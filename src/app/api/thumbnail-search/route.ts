import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth-check'
import { createClient } from '@/lib/supabase/server'
import { fetchPexelsThumbnail, fetchOgImage, fetchWikipediaImage, generateFoodImageBase64 } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    console.error('[thumbnail-search] 認証失敗')
    return NextResponse.json({ url: null }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const sourceUrl = request.nextUrl.searchParams.get('sourceUrl') ?? ''
  const regen = request.nextUrl.searchParams.get('regen') === '1'
  console.log('[thumbnail-search] start q:', q, 'sourceUrl:', sourceUrl, 'regen:', regen)

  // 1. 元ネタURLのog:imageを優先（SNSはスキップ。再取得時はスキップして別画像を探す）
  const skipDomains = ['instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'facebook.com']
  const isSns = skipDomains.some(d => sourceUrl.includes(d))

  if (!regen && sourceUrl && !isSns) {
    const ogImage = await fetchOgImage(sourceUrl)
    console.log('[thumbnail-search] ogImage:', ogImage)
    if (ogImage && !ogImage.includes('rsrc.php') && !ogImage.includes('logo')) {
      return NextResponse.json({ url: ogImage })
    }
  }

  // 2. Pexelsでタイトル検索（再取得時はランダムに別候補）
  if (q && process.env.PEXELS_API_KEY) {
    const url = await fetchPexelsThumbnail(q, [], regen)
    console.log('[thumbnail-search] pexels:', url)
    if (url) return NextResponse.json({ url })
  }

  // 3. Wikipedia（認証不要・無料フォールバック）
  if (q) {
    const url = await fetchWikipediaImage(q)
    console.log('[thumbnail-search] wikipedia:', url)
    if (url) return NextResponse.json({ url })
  }

  // 4. それでも無ければGeminiで画像生成→Supabase Storageへ保存
  if (q) {
    const base64 = await generateFoodImageBase64(q)
    if (base64) {
      try {
        const supabase = await createClient()
        const buffer = Buffer.from(base64, 'base64')
        const fileName = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
        const { error } = await supabase.storage
          .from('recipe-images')
          .upload(fileName, buffer, { contentType: 'image/png', upsert: false })
        if (!error) {
          const { data } = supabase.storage.from('recipe-images').getPublicUrl(fileName)
          console.log('[thumbnail-search] generated:', data.publicUrl)
          return NextResponse.json({ url: data.publicUrl, generated: true })
        }
        console.error('[thumbnail-search] storage upload error:', error)
      } catch (e) {
        console.error('[thumbnail-search] generation save error:', e)
      }
    }
  }

  console.log('[thumbnail-search] 全ソース失敗')
  return NextResponse.json({ url: null })
}
