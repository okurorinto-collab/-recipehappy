'use client'

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import animationData from '../../public/loading.json'
import { trivia } from '@/lib/trivia'

export default function AnalyzingLoader() {
  const [progress, setProgress] = useState(0)
  const [currentTrivia, setCurrentTrivia] = useState(trivia[0])
  const [fade, setFade] = useState(true)

  useEffect(() => {
    // ランダム初期表示
    setCurrentTrivia(trivia[Math.floor(Math.random() * trivia.length)])

    // プログレスバー
    const start = Date.now()
    const duration = 18000
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min(95, Math.floor((elapsed / duration) * 95)))
    }, 100)

    // 雑学を5秒ごとに切り替え
    const triviaTimer = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrentTrivia(trivia[Math.floor(Math.random() * trivia.length)])
        setFade(true)
      }, 400)
    }, 5000)

    return () => {
      clearInterval(progressTimer)
      clearInterval(triviaTimer)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-36 h-36">
        <Lottie animationData={animationData} loop />
      </div>

      <div className="text-center mb-2">
        <p className="font-semibold text-gray-700 text-base">レシピを書いてます...</p>
      </div>

      {/* プログレスバー */}
      <div className="w-64 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }} />
      </div>

      {/* 雑学 */}
      <div className={`mt-4 bg-gray-50 rounded-lg p-4 max-w-sm w-full transition-opacity duration-400 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-xs font-semibold text-green-600 mb-1">{currentTrivia.category}</p>
        <p className="text-sm font-bold text-gray-800 mb-1">{currentTrivia.title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{currentTrivia.text}</p>
      </div>
    </div>
  )
}
