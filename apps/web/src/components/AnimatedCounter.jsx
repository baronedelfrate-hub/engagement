import React, { useEffect, useState } from 'react';
import { useSpring, useTransform } from 'framer-motion';

const AnimatedCounter = ({ value, duration = 2, prefix = "", suffix = "", decimals = 0, isCurrency = false }) => {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (current) => current.toFixed(decimals));
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return display.on("change", (latest) => {
      if (isCurrency) {
          setDisplayValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(latest)));
      } else {
          setDisplayValue(Number(latest).toFixed(decimals));
      }
    });
  }, [display, decimals, isCurrency]);

  // If currency, remove auto BRL prefix if already provided manually, but usually formatter handles it
  return (
    <span className="tabular-nums inline-block">
      {isCurrency ? displayValue : `${prefix}${displayValue}${suffix}`}
    </span>
  );
};

export default AnimatedCounter;