import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from './cn';

export const buttonVariants = cva(
  [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-2',
    'whitespace-nowrap',
    'font-[var(--font-body)]',
    'rounded-[var(--canon-radius-pill)]',
    'transition-all',
    'duration-[var(--canon-duration-fast)]',
    'ease-[var(--canon-ease-out)]',
    'hover:-translate-y-px',
    'active:translate-y-0',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:transform-none',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-[color:var(--canon-indigo)]',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[color:var(--canon-bg)]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'text-white',
          'font-semibold',
          'bg-[image:linear-gradient(90deg,_#6366f1,_#ec4899)]',
          'shadow-[0_8px_24px_rgba(99,102,241,0.25)]',
          'hover:shadow-[0_12px_32px_rgba(236,72,153,0.35)]',
        ].join(' '),
        glass: [
          'text-[color:var(--canon-cream)]',
          'bg-[color:rgba(255,255,255,0.04)]',
          'border',
          'border-[color:rgba(255,255,255,0.14)]',
          'hover:bg-[color:rgba(255,255,255,0.07)]',
          'hover:border-[color:rgba(255,255,255,0.22)]',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'border',
          'border-[color:rgba(99,102,241,0.30)]',
          'text-[color:var(--canon-indigo-2)]',
          'hover:bg-[color:rgba(99,102,241,0.08)]',
          'hover:border-[color:rgba(99,102,241,0.60)]',
        ].join(' '),
        'ghost-solid': [
          'bg-[color:rgba(240,235,224,0.92)]',
          'text-[color:var(--canon-bg)]',
          'font-bold',
          'hover:bg-[color:var(--canon-cream)]',
        ].join(' '),
      },
      size: {
        sm: 'h-[34px] px-[14px] text-[12.5px] font-medium',
        md: 'h-[42px] px-[20px] text-[13.5px] font-semibold',
        lg: 'h-[52px] px-[28px] text-[15px] font-semibold',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = 'button', asChild = false, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  const compProps = asChild ? rest : { type, ...rest };
  return (
    <Comp
      ref={ref as React.Ref<HTMLButtonElement>}
      className={cn(buttonVariants({ variant, size }), className)}
      {...compProps}
    />
  );
});
