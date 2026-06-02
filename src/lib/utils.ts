// 共通ユーティリティ（サーバー・クライアント両方で使用可能）

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
