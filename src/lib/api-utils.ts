// API専用ユーティリティ（サーバーサイドAPIルートのみで使用）

const SNS_DOMAINS = ['instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'facebook.com']
const LOGO_PATTERNS = ['rsrc.php', '/logo', 'brand', 'icon', 'favicon']

export async function fetchOgImage(url: string): Promise<string | null> {
  if (SNS_DOMAINS.some(d => url.includes(d))) return null
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()
    const match =
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i)
    const ogUrl = match?.[1] ?? null
    if (!ogUrl) return null
    if (LOGO_PATTERNS.some(p => ogUrl.toLowerCase().includes(p))) return null
    return ogUrl
  } catch {
    return null
  }
}

export async function fetchPexelsThumbnail(title: string, ingredients: string[] = []): Promise<string | null> {
  const mainIngredient = ingredients[0]?.split('|')[0] ?? ''
  const queries = [
    title,
    mainIngredient ? `${mainIngredient} 料理` : '',
    '料理 food',
  ].filter(Boolean)

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape`,
        { headers: { Authorization: process.env.PEXELS_API_KEY! } }
      )
      const data = await res.json()
      const url = data.photos?.[0]?.src?.medium ?? null
      if (url) return url
    } catch { /* continue */ }
  }
  return null
}
