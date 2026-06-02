export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto">
        <div className="bg-white px-5 pt-8 pb-5">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 px-5 py-4 bg-white border-b border-gray-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-14 h-14 rounded-lg bg-gray-200 animate-pulse" />
              <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden">
              <div className="w-full aspect-square bg-gray-200 animate-pulse" />
              <div className="p-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
