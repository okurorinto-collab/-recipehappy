// API専用ユーティリティ（サーバーサイドAPIルートのみで使用）

const SNS_DOMAINS = ['instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'facebook.com']
const LOGO_PATTERNS = ['rsrc.php', '/logo', 'brand', 'icon', 'favicon']
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function fetchOgImage(url: string): Promise<string | null> {
  if (SNS_DOMAINS.some(d => url.includes(d))) return null
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+(?:name|property)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']twitter:image["']/i,
    ]
    for (const pattern of patterns) {
      const ogUrl = html.match(pattern)?.[1] ?? null
      if (!ogUrl) continue
      if (LOGO_PATTERNS.some(p => ogUrl.toLowerCase().includes(p))) continue
      return ogUrl
    }
    return null
  } catch {
    return null
  }
}

// Wikipedia REST API（認証不要・無料）でレシピタイトルから画像を取得
export async function fetchWikipediaImage(title: string): Promise<string | null> {
  // タイトルを「と」「の」などで分割して候補キーワードを作る
  const candidates = [
    title,
    ...title.split(/[とのをがにでは、。]/).map(s => s.trim()).filter(s => s.length > 1),
  ]
  for (const query of candidates) {
    try {
      const res = await fetch(
        `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
        {
          headers: { 'User-Agent': 'RecipeHappy/1.0' },
          signal: AbortSignal.timeout(4000),
        }
      )
      if (!res.ok) continue
      const data = await res.json()
      const url: string | null = data.thumbnail?.source ?? null
      if (url) return url
    } catch { continue }
  }
  return null
}

const JP_TO_EN: Record<string, string> = {
  'プリン': 'pudding', 'カレー': 'curry', 'ラーメン': 'ramen', 'うどん': 'udon noodles',
  'そば': 'soba noodles', 'パスタ': 'pasta', 'ピザ': 'pizza', 'ハンバーグ': 'hamburger steak',
  '唐揚げ': 'fried chicken', 'から揚げ': 'fried chicken', '餃子': 'gyoza dumplings',
  'チャーハン': 'fried rice', '親子丼': 'oyakodon rice bowl', '牛丼': 'beef bowl',
  'みそ汁': 'miso soup', '味噌汁': 'miso soup', '肉じゃが': 'nikujaga stew',
  '天ぷら': 'tempura', '寿司': 'sushi', 'おにぎり': 'onigiri rice ball',
  'チーズケーキ': 'cheesecake', 'ショートケーキ': 'strawberry shortcake',
  'クッキー': 'cookies', 'パンケーキ': 'pancakes', 'ホットケーキ': 'pancakes',
  '炒め物': 'stir fry', '煮物': 'simmered dish', '焼き魚': 'grilled fish',
  'エビマヨ': 'shrimp mayonnaise', '麻婆豆腐': 'mapo tofu',
}

function toEnglishQuery(title: string): string {
  for (const [jp, en] of Object.entries(JP_TO_EN)) {
    if (title.includes(jp)) return en
  }
  return title
}

// Geminiで料理名→Pexels検索用の英語キーワードを生成
async function generateSearchKeywords(title: string): Promise<string[]> {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const r = await model.generateContent(
      `料理「${title}」の写真をストックフォトで探すための英語検索キーワードを、ヒットしやすい順に3つ、カンマ区切りだけで返してください（説明不要）。例: fluffy pancakes, japanese pancake, dessert`
    )
    return r.response.text().trim().split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
  } catch {
    return []
  }
}

async function searchPexels(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: process.env.PEXELS_API_KEY! } }
    )
    const data = await res.json()
    return data.photos?.[0]?.src?.medium ?? null
  } catch {
    return null
  }
}

export async function fetchPexelsThumbnail(title: string, ingredients: string[] = []): Promise<string | null> {
  const mainIngredient = ingredients[0]?.split('|')[0] ?? ''
  const enTitle = toEnglishQuery(title)

  // 1. Geminiが生成した英語キーワードを最優先で試す
  const aiKeywords = await generateSearchKeywords(title)

  const queries = [
    ...aiKeywords,
    enTitle !== title ? enTitle : '',
    mainIngredient ? `${mainIngredient} food` : '',
    'Japanese food',
  ].filter((q, i, arr) => q && arr.indexOf(q) === i)

  for (const q of queries) {
    const url = await searchPexels(q)
    if (url) return url
  }
  return null
}
