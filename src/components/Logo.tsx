import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* LOGO IMAGE */}
      <div className={`${sizes[size]} rounded-full overflow-hidden shadow-lg`}>
        <img
          src="/logo.jpeg"
          alt="RebelCraves Logo"
          className="w-full h-full object-cover scale-110"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* OPTIONAL TEXT */}
      {showText && (
        <div className="flex flex-col -space-y-1">
          <span className="text-xl font-black text-white tracking-tight">
            RebelCraves
          </span>
          <span className="text-[10px] font-bold text-accent-500 uppercase tracking-widest">
            City Delivery
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
