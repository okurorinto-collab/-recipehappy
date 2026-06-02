// 共通ユーティリティ

export function parseItem(item: string): { name: string; amount: string } {
  if (item.includes('|')) {
    const [name, amount] = item.split('|')
    return { name: name ?? item, amount: amount ?? '' }
  }
  const match = item.match(/^(.+?)\s+([\d.]+[^\s]*|小さじ.+|大さじ.+|[０-９]+.*)$/)
  if (match) return { name: match[1], amount: match[2] }
  return { name: item, amount: '' }
}

export function formatItem(name: string, amount: string): string {
  return `${name}|${amount}`
}

export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()
    const match = html.match(/<meta[^>]+(?:property="og:image"|name="og:image")[^>]+content="([^"]+)"/i)
      ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property="og:image"|name="og:image")/i)
    return match?.[1] ?? null
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
