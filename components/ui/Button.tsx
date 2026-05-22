import { cva, type VariantProps } from 'class-variance-authority';
import { ElementType, ReactNode, ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium rounded-none tracking-[-0.005em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-[.42] disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--rust)] text-white hover:bg-[var(--rust-glow,#D97757)] plate-shadow focus-visible:ring-[var(--rust)]',
        secondary:
          'bg-[var(--forest-green)] text-white hover:bg-[var(--forest-green-dark)] plate-shadow focus-visible:ring-[var(--forest-green)]',
        tertiary:
          'bg-[var(--slate-blue)] text-white hover:bg-[var(--slate-blue-dark)] plate-shadow focus-visible:ring-[var(--slate-blue)]',
        ghost:
          'bg-transparent text-white hover:bg-white/[0.06] focus-visible:ring-white/30',
        danger:
          'bg-[#8C2A1A] text-white hover:bg-[#A33523] plate-shadow focus-visible:ring-[#8C2A1A]',
        outline:
          'border border-white/[0.18] bg-transparent text-white hover:bg-white/[0.04] hover:border-white/30 focus-visible:ring-white/30',
      },
      size: {
        xs: 'h-[26px] px-[9px] text-[12px] gap-[5px]',
        sm: 'h-[32px] px-3 text-[13px] gap-[6px]',
        md: 'h-[38px] px-4 text-sm',
        lg: 'h-[46px] px-5 text-[15px] gap-[9px]',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
  leftIcon?: ElementType;
  rightIcon?: ElementType;
  iconSize?: number;
  children?: ReactNode;
  className?: string;
};

type AsButton = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

type AsLink = ButtonBaseProps & {
  href: string;
  target?: string;
  rel?: string;
};

type ButtonProps = AsButton | AsLink;

export default function Button({
  variant,
  size,
  fullWidth,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconSize = 16,
  children,
  className,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className);

  const content = (
    <>
      {LeftIcon && <LeftIcon size={iconSize} />}
      {children}
      {RightIcon && <RightIcon size={iconSize} />}
    </>
  );

  if ('href' in props && props.href) {
    const { href, target, rel } = props as AsLink;
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
}

export { buttonVariants };
