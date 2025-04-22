"use client"

import {useMemo} from "react"

interface PizzaChartProps {
    slicesByType: Record<string, number>
    showLegend?: boolean
}

export function PizzaChart({slicesByType, showLegend = false}: PizzaChartProps) {
    const slices = useMemo(() => {
        const result: { type: string; count: number; color: string }[] = []

        // Define colors for the three pizza types
        const colors: Record<string, string> = {
            margherita: "#8c3cfb",
            marinara: "#ef4444",
            piccante: "#16d7f9",
        }

        Object.entries(slicesByType).forEach(([type, count]) => {
            const color = colors[type] || "#8e8e8e" // default grey if type not found

            for (let i = 0; i < count; i++) {
                result.push({type, count: 1, color})
            }
        })

        return result
    }, [slicesByType])

    // If there are no slices, show empty state
    if (slices.length === 0) {
        return (
            <div
                className="w-full aspect-square rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Empty</span>
            </div>
        )
    }

    return (
        <div className="relative w-full aspect-square">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="none" className="stroke-gray-300 dark:stroke-gray-700" strokeWidth="1"/>

                {/* Dividing lines for 8 slices */}
                <line x1="50" y1="2" x2="50" y2="98" className="stroke-gray-300 dark:stroke-gray-700" strokeWidth="0.75"/>
                <line x1="2" y1="50" x2="98" y2="50" className="stroke-gray-300 dark:stroke-gray-700" strokeWidth="0.75"/>
                <line x1="14.64" y1="14.64" x2="85.36" y2="85.36" className="stroke-gray-300 dark:stroke-gray-700" strokeWidth="0.75"/>
                <line x1="85.36" y1="14.64" x2="14.64" y2="85.36" className="stroke-gray-300 dark:stroke-gray-700" strokeWidth="0.75"/>

                {/* Pizza slices */}
                {slices.map((slice, index) => {
                    const angle = (index * 45) % 360
                    const startAngle = (angle * Math.PI) / 180
                    const endAngle = ((angle + 45) * Math.PI) / 180

                    const x1 = 50 + 48 * Math.sin(startAngle)
                    const y1 = 50 - 48 * Math.cos(startAngle)
                    const x2 = 50 + 48 * Math.sin(endAngle)
                    const y2 = 50 - 48 * Math.cos(endAngle)

                    const largeArcFlag = 0 // 0 for arcs less than 180 degrees

                    const pathData = `
            M 50 50
            L ${x1} ${y1}
            A 48 48 0 ${largeArcFlag} 1 ${x2} ${y2}
            Z
          `

                    return <path key={index} d={pathData} fill={slice.color} stroke="#fff" strokeWidth="0.5"/>
                })}
            </svg>
        </div>
    )
}