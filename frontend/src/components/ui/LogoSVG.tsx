/**
 * LogoSVG — Logo vectoriel de l'application Cépage
 * Utilisé dans le header et la sidebar.
 */

export default function LogoSVG() {
  return (
    <svg className="logo-icon" viewBox="0 0 44 48" fill="none">
      {/* Coupe du verre */}
      <path
        d="M7 5 L37 5 L30 27 Q28 32 22 32 Q16 32 14 27 Z"
        fill="url(#glassGrad)"
      />
      {/* Surface du vin (reflet) */}
      <ellipse cx="22" cy="10" rx="12" ry="3" fill="rgba(212,175,55,0.25)" />
      {/* Pied du verre */}
      <path d="M20.5 32 L20 40" stroke="url(#stemGrad)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Base */}
      <path d="M13 40 Q13 43 22 43 Q31 43 31 40 Z" fill="url(#baseGrad)" />
      {/* Feuille de vigne gauche */}
      <path d="M7 13 Q1 11 3 19 Q5 24 10 21 Q8 16 7 13 Z" fill="#C8A951" opacity="0.75" />
      <path d="M7 15 Q5 17 7 20" stroke="#C8A951" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      {/* Feuille de vigne droite */}
      <path d="M37 13 Q43 11 41 19 Q39 24 34 21 Q36 16 37 13 Z" fill="#C8A951" opacity="0.75" />
      <path d="M37 15 Q39 17 37 20" stroke="#C8A951" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      {/* Grappe de raisin (petits cercles) */}
      <circle cx="5" cy="24" r="2.2" fill="#8B2635" opacity="0.9" />
      <circle cx="9" cy="27" r="2" fill="#8B2635" opacity="0.85" />
      <circle cx="5" cy="28.5" r="1.8" fill="#6B1F32" opacity="0.85" />
      <circle cx="9" cy="23" r="1.7" fill="#9B3042" opacity="0.8" />
      {/* Reflet sur le verre */}
      <path d="M10 8 Q11 14 10 20" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="glassGrad" x1="22" y1="5" x2="22" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.9" />
          <stop offset="30%" stopColor="#9B2335" />
          <stop offset="70%" stopColor="#6B1020" />
          <stop offset="100%" stopColor="#3D0A10" />
        </linearGradient>
        <linearGradient id="stemGrad" x1="20" y1="32" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6B2030" />
          <stop offset="100%" stopColor="#9B4020" />
        </linearGradient>
        <linearGradient id="baseGrad" x1="13" y1="40" x2="31" y2="43" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5C1A28" />
          <stop offset="100%" stopColor="#8B4020" />
        </linearGradient>
      </defs>
    </svg>
  );
}
