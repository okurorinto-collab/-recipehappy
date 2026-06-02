'use client'

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import animationData from '../../public/loading.json'

export default function AnalyzingLoader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const duration = 18000 // 18秒で95%まで
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const p = Math.min(95, Math.floor((elapsed / duration) * 95))
      setProgress(p)
    }, 100)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
      <div className="w-48 h-48">
        <Lottie animationData={animationData} loop />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700 mb-4">AIが解析中...</p>
        <div className="w-64 bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{progress}%</p>
      </div>
    </div>
  )
}
