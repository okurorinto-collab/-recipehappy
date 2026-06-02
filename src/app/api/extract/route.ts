import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const PROMPT = `この画像（複数枚ある場合は全て）からレシピ情報を抽出してください。英語・韓国語など日本語以外のレシピも必ず日本語に翻訳してください。
複数枚の画像がある場合は情報を統合して1つのレシピにまとめてください。
以下のJSON形式で返してください（他のテキストは不要）:
{
  "title": "レシピ名",
  "ingredients": ["食材名|量", ...],
  "seasonings": ["調味料名|量", ...],
  "steps": "作り方の手順（文字列）",
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
  "steps": "作り方の手順（文字列）",
  "category": "gattsu or assari or jitan or oyatsu or other"
}
レシピが見つからない場合は { "error": "レシピが見つかりませんでした" } を返してください。`

async function extractFromImages(files: File[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const parts: Parameters<typeof model.generateContent>[0] = [PROMPT]
  for (const file of files) {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    parts.push({ inlineData: { mimeType: file.type, data: base64 } } as never)
  }
  const result = await model.generateContent(parts as never)
  const text = result.response.text().trim()
  return JSON.parse(text.replace(/```json\n?|\n?```/g, ''))
}

async function extractFromUrl(url: string) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(`${URL_PROMPT}\n\n${text}`)
    const resText = result.response.text().trim()
    return JSON.parse(resText.replace(/```json\n?|\n?```/g, ''))
  } catch {
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
  try {
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const sourceUrl = formData.get('sourceUrl') as string | null

    let imageResult: ReturnType<typeof extractFromImages> extends Promise<infer T> ? T : never = null as never
    let urlResult: typeof imageResult = null as never

    if (files.length > 0) {
      imageResult = await extractFromImages(files)
      if (imageResult?.error) return NextResponse.json({ error: imageResult.error }, { status: 422 })
    }

    if (sourceUrl) {
      urlResult = await extractFromUrl(sourceUrl)
    }

    // 両方ある場合は一致チェック
    if (imageResult && urlResult && !urlResult.error) {
      const sim = calcSimilarity(imageResult.title ?? '', urlResult.title ?? '')
      if (sim < 0.3) {
        return NextResponse.json({
          error: 'mismatch',
          message: `スクショとURLのレシピが一致しません。\nスクショ:「${imageResult.title}」\nURL:「${urlResult.title}」`,
          imageResult,
          urlResult,
        }, { status: 409 })
      }
      // 一致→統合（スクショ優先、URLで補完）
      imageResult.steps = imageResult.steps || urlResult.steps
      imageResult.ingredients = imageResult.ingredients?.length ? imageResult.ingredients : urlResult.ingredients
      imageResult.seasonings = imageResult.seasonings?.length ? imageResult.seasonings : urlResult.seasonings
    }

    const finalResult = imageResult ?? urlResult
    if (!finalResult || finalResult.error) {
      return NextResponse.json({ error: 'レシピが見つかりませんでした' }, { status: 422 })
    }

    // Pexelsサムネイル取得（タイトル→メイン食材の順でフォールバック）
    let thumbnailUrl: string | null = null
    try {
      const mainIngredient = finalResult.ingredients?.[0]?.split('|')[0] ?? ''
      const queries = [
        finalResult.title,
        mainIngredient ? `${mainIngredient} 料理` : '',
        '料理 food',
      ].filter(Boolean)

      for (const q of queries) {
        const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape`, {
          headers: { Authorization: process.env.PEXELS_API_KEY! },
        })
        const pexelsData = await pexelsRes.json()
        thumbnailUrl = pexelsData.photos?.[0]?.src?.medium ?? null
        if (thumbnailUrl) break
      }
    } catch { /* 無視 */ }

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
