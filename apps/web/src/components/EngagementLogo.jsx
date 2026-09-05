import React from 'react';

const LOGO_URL = "https://horizons-cdn.hostinger.com/43ae158d-775e-48c7-b200-7254194a0f9e/959ac9aceecfe0e1b33c42b3b1f58eb6.png";

const EngagementLogo = ({ className, height = 100, ...props }) => {
  return (
    <img 
      src={LOGO_URL} 
      alt="Engagement Logo" 
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      className={`object-contain ${className || ''}`}
      {...props}
    />
  );
};

export default EngagementLogo;