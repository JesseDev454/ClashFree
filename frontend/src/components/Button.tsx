import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-hover)] ease-[var(--ease-standard)]',
    'active:scale-[0.98] active:duration-[var(--duration-press)]',
    'disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(15_23_42/0.12)] hover:bg-primary-hover disabled:hover:bg-primary',
        outline:
          'border border-border bg-card text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] hover:border-border-strong hover:bg-muted disabled:hover:bg-card',
        subtle: 'bg-muted text-foreground hover:bg-border',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        danger:
          'bg-danger-solid text-white shadow-[0_1px_2px_rgb(15_23_42/0.12)] hover:brightness-110',
        link: 'h-auto px-0 text-primary-text underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        md: 'h-10 px-4 text-sm',
        sm: 'h-8 px-3 text-[13px]',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = 'button', ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  )
})
