export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full h-56 bg-gray-200 animate-pulse" />
      <div className="max-w-lg mx-auto px-4 pb-10">
        <div className="bg-white rounded-lg -mt-6 relative z-10 p-5 mb-4">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg p-5 mb-4">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse mb-4" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-gray-50">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
