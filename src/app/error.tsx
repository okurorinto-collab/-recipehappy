'use client'

export default function Error({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-red-50 rounded-lg p-6 max-w-lg w-full">
        <h2 className="font-bold text-red-700 mb-2">エラーが発生しました</h2>
        <p className="text-red-600 text-sm font-mono break-all">{error.message}</p>
        <p className="text-red-400 text-xs mt-2 font-mono break-all">{error.stack}</p>
      </div>
    </div>
  )
}
