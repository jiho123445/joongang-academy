import React from 'react';

interface AcademyLogoSealProps {
  className?: string;
  size?: number;
}

export const AcademyLogoSeal: React.FC<AcademyLogoSealProps> = ({
  className = "w-10 h-10",
}) => {
  return (
    <div className={`relative shrink-0 flex items-center justify-center ${className}`}>
      <img
        src="/academy-logo.png"
        alt="홍천 중앙정보처리학원 로고"
        className="w-full h-full object-contain rounded-full bg-white"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default AcademyLogoSeal;
