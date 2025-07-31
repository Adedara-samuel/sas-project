'use client'

interface ProgressBarProps {
    percentage: number
    color?: string
}

export default function ProgressBar({ percentage, color = 'bg-blue-500' }: ProgressBarProps) {
    return (
        <div className="w-full bg-gray-200 rounded-full h-2">
            <div
                className={`h-2 rounded-full ${color}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    )
}