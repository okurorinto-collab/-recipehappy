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
  // source: 'web' = og/Pexels/Wikipedia / 'ai' = Gemini生成のみ
  const source = request.nextUrl.searchParams.get('source') ?? 'web'
  console.log('[thumbnail-search] start q:', q, 'source:', source, 'regen:', regen)

  if (source === 'web') {
    // 1. 元ネタURLのog:image（SNS・再取得時はスキップ）
    const skipDomains = ['instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'facebook.com']
    const isSns = skipDomains.some(d => sourceUrl.includes(d))

    if (!regen && sourceUrl && !isSns) {
      const ogImage = await fetchOgImage(sourceUrl)
      if (ogImage && !ogImage.includes('rsrc.php') && !ogImage.includes('logo')) {
        return NextResponse.json({ url: ogImage })
      }
    }

    // 2. Pexels（再取得時はランダム）
    if (q && process.env.PEXELS_API_KEY) {
      const url = await fetchPexelsThumbnail(q, [], regen)
      if (url) return NextResponse.json({ url })
    }

    // 3. Wikipedia
    if (q) {
      const url = await fetchWikipediaImage(q)
      if (url) return NextResponse.json({ url })
    }

    return NextResponse.json({ url: null, message: 'Webで画像が見つかりませんでした。AI生成を試してください' })
  }

  // source === 'ai': Geminiで画像生成→Supabase Storageへ保存
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
