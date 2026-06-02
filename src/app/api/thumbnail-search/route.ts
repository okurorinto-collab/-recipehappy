import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (!q) return NextResponse.json({ url: null })

  const queries = [q, `${q.split(/[・、]/)[0]} 料理`, '料理 food']

  for (const query of queries) {
    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
        headers: { Authorization: process.env.PEXELS_API_KEY! },
      })
      const data = await res.json()
      const url = data.photos?.[0]?.src?.medium ?? null
      if (url) return NextResponse.json({ url })
    } catch { /* continue */ }
  }

  return NextResponse.json({ url: null })
}
