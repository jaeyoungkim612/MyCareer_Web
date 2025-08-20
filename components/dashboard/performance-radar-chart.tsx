"use client"

import { useEffect, useState } from "react"
import { getAllScores, loadScoresForEmployee } from "@/data/performance-scores"
import { useAuth } from "@/contexts/auth-context"

interface PerformanceRadarChartProps {
  empno?: string
}

export function PerformanceRadarChart({ empno }: PerformanceRadarChartProps = {}) {
  const { user } = useAuth()
  const [performanceScores, setPerformanceScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadScores() {
      try {
        const targetEmpno = empno || user?.empno
        if (targetEmpno) {
          await loadScoresForEmployee(targetEmpno)
          const scores = getAllScores()
          
          // Convert to radar chart format with safe number conversion
          const radarData = scores.map(score => ({
            category: score.category,
            current: Number(score.currentScore) || 0,
            target: Number(score.targetScore) || 0,
          }))
          
          console.log('🔢 Safe converted radar data:', radarData)
          
          setPerformanceScores(radarData)
        }
      } catch (error) {
        console.error("점수 로딩 실패:", error)
      } finally {
        setLoading(false)
      }
    }

    loadScores()
  }, [empno, user?.empno])

  if (loading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">점수 로딩 중...</div>
      </div>
    )
  }

  if (performanceScores.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">점수 데이터가 없습니다.</div>
      </div>
    )
  }

  const size = 300
  const center = size / 2
  const maxRadius = 100
  const levels = 5

  // 5개 축의 각도 계산 (12시 방향부터 시계방향) - 안전한 계산
  const angleStep = performanceScores.length > 0 ? (2 * Math.PI) / performanceScores.length : 0
  
  if (angleStep === 0 || !isFinite(angleStep)) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">차트 데이터를 계산할 수 없습니다.</div>
      </div>
    )
  }

  // 극좌표를 직교좌표로 변환
  const polarToCartesian = (angle: number, radius: number) => {
    const x = center + radius * Math.sin(angle)
    const y = center - radius * Math.cos(angle)
    return { x, y }
  }

  // 격자선 생성
  const gridLines = []
  for (let level = 1; level <= levels; level++) {
    const radius = (maxRadius * level) / levels
    const points = performanceScores.map((_, index) => {
      const angle = angleStep * index
      return polarToCartesian(angle, radius)
    })

    // 안전한 points 문자열 생성
    const pointsString = points
      .filter((p) => !isNaN(p.x) && !isNaN(p.y))
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ")
    
    if (pointsString) {
      gridLines.push(
        <polygon
          key={level}
          points={pointsString}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />,
      )
    }
  }

  // 축선 생성 (안전한 처리)
  const axisLines = performanceScores.map((_, index) => {
    const angle = angleStep * index
    const end = polarToCartesian(angle, maxRadius)
    
    // NaN 체크
    if (isNaN(end.x) || isNaN(end.y)) {
      console.warn('NaN detected in axis line:', { index, angle, end })
      return null
    }
    
    return <line key={index} x1={center} y1={center} x2={end.x.toFixed(2)} y2={end.y.toFixed(2)} stroke="#e5e7eb" strokeWidth="1" />
  }).filter(Boolean)

  // 현재 점수 데이터 포인트 (안전한 계산)
  const currentDataPoints = performanceScores.map((score, index) => {
    const angle = angleStep * index
    const safeCurrentScore = Number(score.current) || 0
    const radius = (maxRadius * Math.max(0, Math.min(10, safeCurrentScore))) / 10
    const point = polarToCartesian(angle, radius)
    
    // NaN 체크
    if (isNaN(point.x) || isNaN(point.y)) {
      console.warn('NaN detected in currentDataPoints:', { score, angle, radius, point })
      return { x: center, y: center }
    }
    
    return point
  })

  // 목표 점수 데이터 포인트 (안전한 계산)
  const targetDataPoints = performanceScores.map((score, index) => {
    const angle = angleStep * index
    const safeTargetScore = Number(score.target) || 0
    const radius = (maxRadius * Math.max(0, Math.min(10, safeTargetScore))) / 10
    const point = polarToCartesian(angle, radius)
    
    // NaN 체크
    if (isNaN(point.x) || isNaN(point.y)) {
      console.warn('NaN detected in targetDataPoints:', { score, angle, radius, point })
      return { x: center, y: center }
    }
    
    return point
  })

  // 라벨 위치 (안전한 처리)
  const labels = performanceScores.map((score, index) => {
    const angle = angleStep * index
    const labelRadius = maxRadius + 20
    const pos = polarToCartesian(angle, labelRadius)

    // NaN 체크
    if (isNaN(pos.x) || isNaN(pos.y)) {
      console.warn('NaN detected in label position:', { score, angle, pos })
      return null
    }

    return (
      <text
        key={index}
        x={pos.x.toFixed(2)}
        y={pos.y.toFixed(2)}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs font-medium fill-gray-600"
      >
        {score.category}
      </text>
    )
  }).filter(Boolean)

  return (
    <div className="h-[400px] w-full flex flex-col items-center justify-center">
      <svg width={size} height={size} className="mb-4">
        {/* 격자선 */}
        {gridLines}

        {/* 축선 */}
        {axisLines}

        {/* 목표 점수 영역 */}
        {(() => {
          const targetPointsString = targetDataPoints
            .filter((p) => !isNaN(p.x) && !isNaN(p.y))
            .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
            .join(" ")
          
          return targetPointsString ? (
            <polygon
              points={targetPointsString}
              fill="#f97316"
              fillOpacity="0.2"
              stroke="#f97316"
              strokeWidth="2"
            />
          ) : null
        })()}

        {/* 현재 점수 영역 */}
        {(() => {
          const currentPointsString = currentDataPoints
            .filter((p) => !isNaN(p.x) && !isNaN(p.y))
            .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
            .join(" ")
          
          return currentPointsString ? (
            <polygon
              points={currentPointsString}
              fill="#FACC15"
              fillOpacity="0.3"
              stroke="#FACC15"
              strokeWidth="2"
            />
          ) : null
        })()}

        {/* 현재 점수 포인트 */}
        {currentDataPoints
          .filter((point) => !isNaN(point.x) && !isNaN(point.y))
          .map((point, index) => (
            <circle
              key={`current-${index}`}
              cx={point.x.toFixed(2)}
              cy={point.y.toFixed(2)}
              r="4"
              fill="#FACC15"
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}

        {/* 목표 점수 포인트 */}
        {targetDataPoints
          .filter((point) => !isNaN(point.x) && !isNaN(point.y))
          .map((point, index) => (
            <circle
              key={`target-${index}`}
              cx={point.x.toFixed(2)}
              cy={point.y.toFixed(2)}
              r="3"
            fill="#f97316"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}

        {/* 라벨 */}
        {labels}
      </svg>

      {/* 범례 */}
      <div className="flex items-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>자기평가</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span>개선목표</span>
        </div>
      </div>
    </div>
  )
}
