'use client';

/**
 * Button — adapter over beUI's motion button (`components/motion/button/base`).
 *
 * Every button in the app renders beUI underneath, but the prop surface stays
 * the one the 32 existing call sites already use (shadcn's `variant`/`size`/
 * `asChild`). Rewriting those call sites instead would mean 19 `asChild`
 * rewrites for no user-visible gain, so the translation lives here in one
 * reviewable place.
 *
 * Vocabulary differences, and how they are resolved:
 *   variant  default -> primary. `destructive` and `link` have no beUI
 *            equivalent, so they keep their own local classes.
 *   size     default -> md. `xs`/`icon-xs`/`icon-sm`/`icon-lg` have no beUI
 *            equivalent and fall back to local sizing.
 *   asChild  beUI has no Slot support. The child is rendered via Radix `Slot`
 *            with beUI's visual classes applied — so it matches visually but
 *            has no ripple/press animation. Anchors that are NOT `asChild` use
 *            beUI's own `ButtonLink`.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';
import {
  Button as BeButton,
  type ButtonSize as BeSize,
  type ButtonVariant as BeVariant,
} from '@/components/motion/button/base';

/** Shared with call sites that import `buttonVariants` directly (4 of them). */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-all outline-none active:translate-y-px focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/88',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted/60',
        secondary: 'border border-border bg-card text-foreground hover:border-border',
        ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 text-[13px] gap-1.5 rounded-md',
        xs: "h-6 gap-1 rounded-md px-2 text-[11px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-7 px-3 text-xs gap-1.5 rounded-md',
        lg: 'h-10 px-5 text-sm gap-2 rounded-md',
        icon: 'h-7 w-7 rounded-md',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-7 rounded-md',
        'icon-lg': 'size-9 rounded-md',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

/**
 * Chunky "physical" treatment: a hard offset shadow under the button that
 * collapses as it is pressed, so the control reads as a real object rather
 * than a painted rectangle. The offset colour is per-variant so the shadow is
 * always a darker shade of the button itself, never a generic grey smear.
 * `ghost` is excluded -- it is a text affordance, not a raised surface.
 */
const CHUNKY_BASE =
  'font-semibold transition-[transform,box-shadow,background-color] duration-100 ' +
  'active:translate-y-[2px] disabled:shadow-none disabled:translate-y-0';

// A single hard 2px lip, no ambient blur. The blur was the problem: under a
// dark pill it merged with the offset into a smudge instead of reading as a
// raised edge, and 3px on a fully rounded shape peeked out at the sides as a
// crescent rather than sitting along the bottom.
const CHUNKY_BY_VARIANT: Record<string, string> = {
  // Glass primary: inner top highlight AND the 2px lip must live in a single
  // shadow declaration -- tailwind-merge keeps only the last shadow-* class.
  default: 'shadow-[0_2px_0_0_#000000] active:shadow-none',
  destructive: 'shadow-[0_2px_0_0_#7f1d1d] active:shadow-none',
  secondary: 'shadow-[0_2px_0_0_var(--color-line-strong)] active:shadow-none',
  outline: 'shadow-[0_2px_0_0_var(--color-line-strong)] active:shadow-none',
  ghost: '',
  link: '',
};

const chunky = (v: string) =>
  CHUNKY_BY_VARIANT[v] ? `${CHUNKY_BASE} ${CHUNKY_BY_VARIANT[v]}` : '';

/** Variants/sizes beUI implements natively; anything else renders locally. */
const BE_VARIANT: Partial<Record<string, BeVariant>> = {
  default: 'primary',
  secondary: 'secondary',
  ghost: 'ghost',
  outline: 'outline',
};
const BE_SIZE: Partial<Record<string, BeSize>> = {
  default: 'md',
  sm: 'sm',
  lg: 'lg',
  icon: 'icon',
};

/**
 * React's DOM drag/animation handlers have different signatures from motion's
 * (motion's `onDrag` takes a PanInfo). Dropping them from the surface keeps the
 * spread type-safe without an `unknown` cast; no call site uses them on a
 * button, and `onDrop` targets belong on a container anyway.
 */
type MotionConflicting =
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration';

type ButtonProps = Omit<React.ComponentProps<'button'>, MotionConflicting> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const v = variant ?? 'default';
  const s = size ?? 'default';
  const beVariant = BE_VARIANT[v];
  const beSize = BE_SIZE[s];

  // `asChild` renders the caller's element (usually next/link) — Slot cannot
  // carry beUI's motion props, so it gets the matching classes only.
  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-variant={v}
        data-size={s}
        className={cn(buttonVariants({ variant, size }), chunky(v), className)}
        {...props}
      />
    );
  }

  // Anything beUI covers goes through beUI; the rest keeps local styling so
  // `destructive`, `link` and the extra icon sizes don't silently change.
  if (beVariant && beSize) {
    return (
      <BeButton
        data-slot="button"
        data-variant={v}
        data-size={s}
        variant={beVariant}
        size={beSize}
        className={cn(chunky(v), className)}
        {...props}
      />
    );
  }

  return (
    <button
      data-slot="button"
      data-variant={v}
      data-size={s}
      className={cn(buttonVariants({ variant, size }), chunky(v), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
