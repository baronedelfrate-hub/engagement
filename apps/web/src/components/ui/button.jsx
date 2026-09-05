import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';
import { motion } from 'framer-motion';

const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 relative overflow-hidden',
	{
		variants: {
			variant: {
				default: 'bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-primary-foreground shadow-lg shadow-primary/20 border border-transparent',
				destructive:
          'bg-gradient-to-r from-destructive to-red-600 hover:from-destructive/90 hover:to-red-700 text-destructive-foreground shadow-lg shadow-destructive/20',
				outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-colors',
				secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-secondary/50',
				ghost: 'hover:bg-accent/50 hover:text-accent-foreground hover:scale-105 transition-transform',
				link: 'text-primary underline-offset-4 hover:underline',
        gradient: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-md px-8',
				icon: 'h-10 w-10',
        fab: 'h-14 w-14 rounded-full shadow-xl',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : motion.button;
  
    const createRipple = (event) => {
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.classList.add("ripple");

        const existingRipple = button.getElementsByClassName("ripple")[0];
        if (existingRipple) {
            existingRipple.remove();
        }

        button.appendChild(circle);
    };

    // Only attach motion props if it's not a Slot
    const motionProps = !asChild ? {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        onClick: (e) => {
            createRipple(e);
            if (props.onClick) props.onClick(e);
        }
    } : {};

	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			ref={ref}
            {...motionProps}
			{...props}
		/>
	);
});
Button.displayName = 'Button';

export { Button, buttonVariants };