import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const PROMPT = `この画像からレシピ情報を抽出してください。英語・韓国語など日本語以外のレシピも必ず日本語に翻訳して返してください。
以下のJSON形式で返してください（他のテキストは不要）:
{
  "title": "レシピ名",
  "ingredients": ["食材名|量", ...],
  "seasonings": ["調味料名|量", ...],
  "steps": "作り方の手順（文字列）"
}
ingredientsは野菜・肉・魚介など主な食材、seasoningsは調味料・油・酒・みりんなど。
食材名と量は"|"で区切ってください。量がない場合は "食材名|" としてください。
レシピが見つからない場合は { "error": "レシピが見つかりませんでした" } を返してください。`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent([
      PROMPT,
      { inlineData: { mimeType: file.type, data: base64 } },
    ])

    const text = result.response.text().trim()
    const json = JSON.parse(text.replace(/```json\n?|\n?```/g, ''))

    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 422 })
    }

    // Pexelsでサムネイル取得
    let thumbnailUrl: string | null = null
    try {
      const query = encodeURIComponent(json.title)
      const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`, {
        headers: { Authorization: process.env.PEXELS_API_KEY! },
      })
      const pexelsData = await pexelsRes.json()
      thumbnailUrl = pexelsData.photos?.[0]?.src?.medium ?? null
    } catch {
      // サムネイル取得失敗は無視
    }

    return NextResponse.json({
      title: json.title,
      ingredients: json.ingredients ?? [],
      seasonings: json.seasonings ?? [],
      steps: json.steps,
      thumbnailUrl,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[extract] Gemini error:', msg)
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
      return NextResponse.json(
        { error: 'AI の無料枠を使い切りました。明日また試してください🙏' },
        { status: 429 }
      )
    }
    return NextResponse.json({ error: '抽出に失敗しました' }, { status: 500 })
  }
}
