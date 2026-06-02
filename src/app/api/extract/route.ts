import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth-check'
import { fetchPexelsThumbnail } from '@/lib/api-utils'

const PROMPT = `この画像（複数枚ある場合は全て）からレシピ情報を抽出してください。英語・韓国語など日本語以外のレシピも必ず日本語に翻訳してください。
複数枚の画像がある場合は情報を統合して1つのレシピにまとめてください。
以下のJSON形式で返してください（他のテキストは不要）:
{
  "title": "レシピ名",
  "ingredients": ["食材名|量", ...],
  "seasonings": ["調味料名|量", ...],
  "steps": "作り方。各手順を必ず改行(\\n)で区切る。手順番号や記号は付けない。1手順は1〜2文程度に区切る",
  "category": "gattsu or assari or jitan or oyatsu or other"
}
categoryの判断基準: 肉料理→gattsu, 野菜・魚→assari, 素早く作れる→jitan, スイーツ・おやつ→oyatsu, それ以外→other
食材名と量は"|"で区切ってください。
レシピが見つからない場合は { "error": "レシピが見つかりませんでした" } を返してください。`

const URL_PROMPT = `このテキストはレシピページのHTMLです。レシピ情報を抽出してください。
以下のJSON形式で返してください（他のテキストは不要）:
{
  "title": "レシピ名",
  "ingredients": ["食材名|量", ...],
  "seasonings": ["調味料名|量", ...],
  "steps": "作り方。各手順を必ず改行(\\n)で区切る。手順番号や記号は付けない。1手順は1〜2文程度に区切る",
  "category": "gattsu or assari or jitan or oyatsu or other"
}
レシピが見つからない場合は { "error": "レシピが見つかりませんでした" } を返してください。`

// Gemini REST API 直叩き（AQ.形式キー対応）
async function callGemini(parts: unknown[]): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
      signal: AbortSignal.timeout(30000),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 300))
  const out = data.candidates?.[0]?.content?.parts ?? []
  return out.map((p: { text?: string }) => p.text ?? '').join('')
}

function parseGeminiJson(text: string) {
  return JSON.parse(text.trim().replace(/```json\n?|\n?```/g, ''))
}

async function extractFromImages(files: File[]) {
  const parts: unknown[] = [{ text: PROMPT }]
  for (const file of files) {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    parts.push({ inlineData: { mimeType: file.type, data: base64 } })
  }
  const text = await callGemini(parts)
  return parseGeminiJson(text)
}

async function extractFromUrl(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })
    console.log('[extractFromUrl] status:', res.status)
    const html = await res.text()
    console.log('[extractFromUrl] html length:', html.length)

    // JSON-LD（schema.org/Recipe）を優先的に抽出
    const ldMatches = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    const ldJson = ldMatches.map(m => m[1]).join('\n').slice(0, 8000)
    const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000)
    const text = `${ldJson}\n\n${bodyText}`.slice(0, 14000)

    const resText = await callGemini([{ text: `${URL_PROMPT}\n\n${text}` }])
    console.log('[extractFromUrl] gemini raw:', resText.slice(0, 150))
    return parseGeminiJson(resText)
  } catch (e) {
    console.error('[extractFromUrl] error:', e instanceof Error ? e.message : e)
    return null
  }
}

function calcSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.replace(/\s/g, '').split(''))
  const wordsB = new Set(b.replace(/\s/g, '').split(''))
  const intersection = [...wordsA].filter(c => wordsB.has(c)).length
  return intersection / Math.max(wordsA.size, wordsB.size)
}

export async function POST(request: NextRequest) {
  // 認証チェック
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  try {
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const sourceUrl = formData.get('sourceUrl') as string | null

    let imageResult: Record<string, unknown> | null = null
    let urlResult: Record<string, unknown> | null = null

    if (files.length > 0) {
      imageResult = await extractFromImages(files)
      if (imageResult?.error) return NextResponse.json({ error: imageResult.error }, { status: 422 })
    }

    if (sourceUrl) {
      urlResult = await extractFromUrl(sourceUrl)
    }

    // 両方ある場合は一致チェック
    if (imageResult && urlResult && !urlResult.error) {
      const sim = calcSimilarity(String(imageResult.title ?? ''), String(urlResult.title ?? ''))
      if (sim < 0.3) {
        return NextResponse.json({
          error: 'mismatch',
          message: `スクショとURLのレシピが一致しません。\nスクショ:「${imageResult.title}」\nURL:「${urlResult.title}」`,
          imageResult,
          urlResult,
        }, { status: 409 })
      }
      imageResult.steps = imageResult.steps || urlResult.steps
      imageResult.ingredients = (imageResult.ingredients as unknown[])?.length ? imageResult.ingredients : urlResult.ingredients
      imageResult.seasonings = (imageResult.seasonings as unknown[])?.length ? imageResult.seasonings : urlResult.seasonings
    }

    const finalResult = imageResult ?? urlResult
    if (!finalResult || finalResult.error) {
      return NextResponse.json({ error: 'レシピが見つかりませんでした' }, { status: 422 })
    }

    const thumbnailUrl = await fetchPexelsThumbnail(
      String(finalResult.title ?? ''),
      (finalResult.ingredients as string[]) ?? []
    )

    return NextResponse.json({
      title: finalResult.title,
      ingredients: finalResult.ingredients ?? [],
      seasonings: finalResult.seasonings ?? [],
      steps: finalResult.steps,
      category: finalResult.category ?? 'other',
      thumbnailUrl,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[extract] error:', msg)
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
      return NextResponse.json({ error: 'AIの利用制限に達しました。しばらく待ってから試してください🙏' }, { status: 429 })
    }
    return NextResponse.json({ error: '抽出に失敗しました' }, { status: 500 })
  }
}
