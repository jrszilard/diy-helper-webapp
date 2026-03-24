import { cva, type VariantProps } from 'class-variance-authority';
import { ElementType, ReactNode, ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles shared by all buttons
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--terracotta)] text-white hover:bg-[var(--terracotta-dark)] shadow-sm hover:shadow-md focus-visible:ring-[var(--terracotta)]',
        secondary:
          'bg-[var(--forest-green)] text-white hover:bg-[var(--forest-green-dark)] shadow-sm hover:shadow-md focus-visible:ring-[var(--forest-green)]',
        tertiary:
          'bg-[var(--slate-blue)] text-white hover:bg-[var(--slate-blue-dark)] shadow-sm hover:shadow-md focus-visible:ring-[var(--slate-blue)]',
        ghost:
          'bg-transparent text-[var(--earth-brown)] hover:bg-[var(--earth-sand)] hover:text-[var(--earth-brown-dark)] focus-visible:ring-[var(--earth-brown)]',
        danger:
          'bg-[var(--rust)] text-white hover:bg-[var(--terracotta-dark)] shadow-sm hover:shadow-md focus-visible:ring-[var(--rust)]',
        outline:
          'border border-[var(--earth-brown-light)] bg-transparent text-[var(--earth-brown-dark)] hover:bg-[var(--earth-sand)] hover:border-[var(--earth-brown)] hover:text-[var(--earth-brown-dark)] focus-visible:ring-[var(--earth-brown)]',
      },
      size: {
        xs: 'px-2 py-0.5 text-xs rounded-md',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
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
    const { href, target, rel, ...rest } = props as AsLink;
    return (
      <Link href={href} target={target} rel={rel} className={classes} {...(rest as object)}>
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
