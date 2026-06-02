import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/auth-check'
import { fetchPexelsThumbnail } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ url: null }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (!q) return NextResponse.json({ url: null })

  const url = await fetchPexelsThumbnail(q)
  return NextResponse.json({ url })
}
