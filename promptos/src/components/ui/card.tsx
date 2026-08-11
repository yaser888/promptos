import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'glass' | 'bordered'
  hover?: boolean
}

const variantStyles = {
  default: 'bg-zinc-900/50 border border-zinc-800',
  glass: 'bg-white/[0.02] backdrop-blur-xl border border-zinc-800/50',
  bordered: 'bg-transparent border border-zinc-800',
}

export function Card({ children, variant = 'default', hover = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6',
        variantStyles[variant],
        hover && 'hover:border-zinc-700 transition-colors duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-lg font-semibold text-zinc-100', className)}>{children}</h3>
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-zinc-400', className)}>{children}</p>
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>
}
