import React from 'react';

interface PieceProps {
  className?: string;
}

// =========================================================================
// STANDARD PROFESSIONAL STAUNTON CHESS VECTOR SYSTEM
// =========================================================================
// These pieces are designed to match standard tournament pro sets (as in the photo):
// - White Pieces: Warm luxurious Ivory / Alabaster Cream with smooth volumetric shading and gentle specular glossy reflections.
// - Black Pieces: Sleek solid Satin Obsidian / Charcoal Black with crisp highlights highlighting the curves of each standard shape.
// - Features include standard 3D ground contact shadows and enhanced curves.

export const PawnWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Soft ground-contact ambient shadow */}
      <filter id="pawnShadow" x="-25%" y="-25%" width="150%" height="150%">
         <feGaussianBlur stdDeviation="1.8" result="blur" />
         <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.52 0" />
      </filter>
      {/* Warm Ivory gradient for a realistic, textured, professional look */}
      <linearGradient id="ivoryBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#FAF8F2" />
        <stop offset="65%" stopColor="#F1ECD8" />
        <stop offset="100%" stopColor="#DFD7BE" />
      </linearGradient>
      {/* Highlight sheen for glossy finish */}
      <radialGradient id="ivoryGloss" cx="0.32" cy="0.28" r="0.45">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Contact Shadow */}
    <ellipse cx="22.5" cy="40.5" rx="13.5" ry="3.2" fill="#000000" filter="url(#pawnShadow)" />

    {/* Pedestal Base */}
    <path d="M11 38C11 34.5 13 32.5 22.5 32.5C32 32.5 34 34.5 34 38H11Z" fill="url(#ivoryBody)" />
    <path d="M12.5 35.5C14.5 33.5 18 33.2 22.5 33.2C27 33.2 30.5 33.5 32.5 35.5" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.65" />

    {/* Upper Base Ring */}
    <path d="M13.5 33C13.5 30 16.5 29 22.5 29C28.5 29 31.5 30 31.5 33H13.5Z" fill="url(#ivoryBody)" />

    {/* Slender Tapered Stem Pillar */}
    <path d="M18.8 29.5L20.5 19.5C18.2 18.2 18 16.5 22.5 16.5C27 16.5 26.8 18.2 24.5 19.5L26.2 29.5H18.8Z" fill="url(#ivoryBody)" />
    
    {/* Body specular glow on stem */}
    <path d="M20.8 17.5L19.5 28.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />

    {/* Double Collar Ring */}
    <ellipse cx="22.5" cy="16.5" rx="5" ry="1.2" fill="url(#ivoryBody)" />
    <ellipse cx="22.5" cy="15.2" rx="4.2" ry="1.0" fill="url(#ivoryBody)" />
    <line x1="18.5" y1="15.8" x2="26.5" y2="15.8" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.5" />

    {/* Sphere head */}
    <circle cx="22.5" cy="10.8" r="5.8" fill="url(#ivoryBody)" />
    <circle cx="21" cy="9.0" r="4.3" fill="url(#ivoryGloss)" />
  </svg>
);

export const PawnBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="pawnShadow" x="-25%" y="-25%" width="150%" height="150%">
         <feGaussianBlur stdDeviation="1.8" result="blur" />
         <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.52 0" />
      </filter>
      {/* Satin Black / Deep Obsidian gradient */}
      <linearGradient id="satinBlackBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#4A4E5A" />
        <stop offset="20%" stopColor="#252731" />
        <stop offset="60%" stopColor="#121319" />
        <stop offset="100%" stopColor="#0B0C0E" />
      </linearGradient>
      {/* High reflection glossy gradient */}
      <radialGradient id="satinBlackGloss" cx="0.32" cy="0.28" r="0.45">
        <stop offset="0%" stopColor="#7F8596" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Contact Shadow */}
    <ellipse cx="22.5" cy="40.5" rx="13.5" ry="3.2" fill="#000000" filter="url(#pawnShadow)" />

    {/* Pedestal Base */}
    <path d="M11 38C11 34.5 13 32.5 22.5 32.5C32 32.5 34 34.5 34 38H11Z" fill="url(#satinBlackBody)" />
    <path d="M12.5 35.5C14.5 33.5 18 33.2 22.5 33.2C27 33.2 30.5 33.5 32.5 35.5" stroke="#5E6370" strokeWidth="0.8" opacity="0.4" />

    {/* Upper Base Ring */}
    <path d="M13.5 33C13.5 30 16.5 29 22.5 29C28.5 29 31.5 30 31.5 33H13.5Z" fill="url(#satinBlackBody)" />

    {/* Slender Tapered Stem Pillar */}
    <path d="M18.8 29.5L20.5 19.5C18.2 18.2 18 16.5 22.5 16.5C27 16.5 26.8 18.2 24.5 19.5L26.2 29.5H18.8Z" fill="url(#satinBlackBody)" />
    
    {/* Body specular glow on stem */}
    <path d="M20.8 17.5L19.5 28.5" stroke="#717684" strokeWidth="1.0" strokeLinecap="round" opacity="0.45" />

    {/* Double Collar Ring */}
    <ellipse cx="22.5" cy="16.5" rx="5" ry="1.2" fill="url(#satinBlackBody)" />
    <ellipse cx="22.5" cy="15.2" rx="4.2" ry="1.0" fill="url(#satinBlackBody)" />

    {/* Sphere head */}
    <circle cx="22.5" cy="10.8" r="5.8" fill="url(#satinBlackBody)" />
    <circle cx="21" cy="9.0" r="4.3" fill="url(#satinBlackGloss)" />
  </svg>
);

export const RookWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="rookShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.54 0" />
      </filter>
      <linearGradient id="ivoryBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#FAF8F2" />
        <stop offset="65%" stopColor="#F1ECD8" />
        <stop offset="100%" stopColor="#DFD7BE" />
      </linearGradient>
      <radialGradient id="ivoryGloss" cx="0.4" cy="0.3" r="0.5">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="14.5" ry="3.2" fill="#000000" filter="url(#rookShadow)" />

    {/* Heavy Rounded Base Plinth */}
    <path d="M10.5 38.5C10.5 35 12.5 33 22.5 33C32.5 33 34.5 35 34.5 38.5H10.5Z" fill="url(#ivoryBody)" />
    
    {/* Upper Base Tier */}
    <path d="M12.5 33C12.5 29.5 15.5 28.5 22.5 28.5C29.5 28.5 32.5 29.5 32.5 33H12.5Z" fill="url(#ivoryBody)" />

    {/* High-contrast Castle Pillar / Shaft */}
    <path d="M14.8 28.5L16 19.5H29L30.2 28.5H14.8Z" fill="url(#ivoryBody)" />
    {/* Vertically highlighted side sheen */}
    <path d="M17.5 20L16.2 27.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

    {/* Collar neckband moulding */}
    <ellipse cx="22.5" cy="19.5" rx="7.2" ry="1.4" fill="url(#ivoryBody)" />

    {/* Castle Battlement / Crenellations Cup */}
    <path d="M12.5 12.5L14 19.5H31L32.5 12.5H29.2V15.5H25.8V12.5H19.2V15.5H15.8V12.5H12.5Z" fill="url(#ivoryBody)" stroke="#DECBA5" strokeWidth="0.5" />
    
    {/* Battlement highlights */}
    <path d="M13.2 13L14.5 19" stroke="#FFFFFF" strokeWidth="1.0" opacity="0.7" />
    <path d="M31.8 13L30.5 19" stroke="#E6E0CB" strokeWidth="1.0" opacity="0.6" />
  </svg>
);

export const RookBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="rookShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.54 0" />
      </filter>
      <linearGradient id="satinBlackBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#4A4E5A" />
        <stop offset="20%" stopColor="#252731" />
        <stop offset="60%" stopColor="#121319" />
        <stop offset="100%" stopColor="#0B0C0E" />
      </linearGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="14.5" ry="3.2" fill="#000000" filter="url(#rookShadow)" />

    {/* Heavy Rounded Base Plinth */}
    <path d="M10.5 38.5C10.5 35 12.5 33 22.5 33C32.5 33 34.5 35 34.5 38.5H10.5Z" fill="url(#satinBlackBody)" />
    
    {/* Upper Base Tier */}
    <path d="M12.5 33C12.5 29.5 15.5 28.5 22.5 28.5C29.5 28.5 32.5 29.5 32.5 33H12.5Z" fill="url(#satinBlackBody)" />

    {/* High-contrast Castle Pillar / Shaft */}
    <path d="M14.8 28.5L16 19.5H29L30.2 28.5H14.8Z" fill="url(#satinBlackBody)" />
    {/* Vertically highlighted side sheen */}
    <path d="M17.5 20L16.2 27.5" stroke="#717684" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

    {/* Collar neckband moulding */}
    <ellipse cx="22.5" cy="19.5" rx="7.2" ry="1.4" fill="url(#satinBlackBody)" />

    {/* Castle Battlement / Crenellations Cup */}
    <path d="M12.5 12.5L14 19.5H31L32.5 12.5H29.2V15.5H25.8V12.5H19.2V15.5H15.8V12.5H12.5Z" fill="url(#satinBlackBody)" stroke="#090A0D" strokeWidth="0.5" />
    
    {/* Battlement highlights */}
    <path d="M13.2 13L14.5 19" stroke="#525766" strokeWidth="1.0" opacity="0.4" />
  </svg>
);

export const KnightWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="knightShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.55 0" />
      </filter>
      <linearGradient id="ivoryBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#FAF8F2" />
        <stop offset="65%" stopColor="#F1ECD8" />
        <stop offset="100%" stopColor="#DFD7BE" />
      </linearGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="14.5" ry="3.2" fill="#000000" filter="url(#knightShadow)" />

    {/* Bottom Base Plinth */}
    <path d="M10.5 38.5C10.5 35 12.5 33 22.5 33C32.5 33 34.5 35 34.5 38.5H10.5Z" fill="url(#ivoryBody)" />
    
    {/* Upper Base Tier */}
    <path d="M12.5 33C12.5 29.5 15.5 28 22.5 28C29.5 28 32.5 29.5 32.5 33H12.5Z" fill="url(#ivoryBody)" />

    {/* Highly-detailed Standard Staunton Warhorse Profile matching the photo */}
    {/* Features a strong arched neck, perked ears, muscular chest details, and detailed jaw line */}
    <path 
      d="M31.5 33C31.5 27.5 31.0 22.5 28.5 18.5C26.5 15.2 24.2 12.2 24.2 12.2C24.2 12.2 25.2 9.5 23.5 7.5C22.2 5.8 19.5 4.8 19.5 4.8C19.5 4.8 20.0 6.8 19.2 8.2C18.2 9.8 14.5 11.2 12.5 12.8C10.5 14.4 9.2 17.5 9.2 20.2C9.2 22.8 11.2 24.2 11.8 23.8C12.5 23.5 16.2 21.8 16.2 20.2C16.2 18.5 17.2 16.0 20.2 16.5C20.2 16.5 21.5 21.5 17.8 27.2L14.2 29V33.2H31.5Z" 
      fill="url(#ivoryBody)" 
      stroke="#C5BEAC" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />

    {/* Muscle and harness/eye contours of standard tournament knight */}
    {/* Subtle Eye */}
    <circle cx="15.5" cy="14.5" r="0.8" fill="#78716C" opacity="0.8" />
    
    {/* Nostril line */}
    <path d="M11.2 18.8C11.6 19.2 12.2 19.5 12.8 19.4" stroke="#78716C" strokeWidth="0.6" strokeLinecap="round" />

    {/* Arched Neck Mane Highlights */}
    <path d="M22.8 9.2C23.8 12.0 27.2 15.5 29.5 19.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    <path d="M21.0 7.2C21.8 8.8 24.2 11.0 25.5 13.0" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />

    {/* Jaw contour / muscle shadow overlay to look 3D */}
    <path d="M22.5 16.5C22.5 16.5 19.5 21.2 15.8 24.5" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
    <path d="M27.2 22C27.2 22 28.5 26.5 28.5 31.5" stroke="#C5BEAC" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

export const KnightBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="knightShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.55 0" />
      </filter>
      <linearGradient id="satinBlackBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#4A4E5A" />
        <stop offset="20%" stopColor="#252731" />
        <stop offset="60%" stopColor="#121319" />
        <stop offset="100%" stopColor="#0B0C0E" />
      </linearGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="14.5" ry="3.2" fill="#000000" filter="url(#knightShadow)" />

    {/* Bottom Base Plinth */}
    <path d="M10.5 38.5C10.5 35 12.5 33 22.5 33C32.5 33 34.5 35 34.5 38.5H10.5Z" fill="url(#satinBlackBody)" />
    
    {/* Upper Base Tier */}
    <path d="M12.5 33C12.5 29.5 15.5 28 22.5 28C29.5 28 32.5 29.5 32.5 33H12.5Z" fill="url(#satinBlackBody)" />

    {/* Highly-detailed Standard Staunton Warhorse Profile matching the photo */}
    <path 
      d="M31.5 33C31.5 27.5 31.0 22.5 28.5 18.5C26.5 15.2 24.2 12.2 24.2 12.2C24.2 12.2 25.2 9.5 23.5 7.5C22.2 5.8 19.5 4.8 19.5 4.8C19.5 4.8 20.0 6.8 19.2 8.2C18.2 9.8 14.5 11.2 12.5 12.8C10.5 14.4 9.2 17.5 9.2 20.2C9.2 22.8 11.2 24.2 11.8 23.8C12.5 23.5 16.2 21.8 16.2 20.2C16.2 18.5 17.2 16.0 20.2 16.5C20.2 16.5 21.5 21.5 17.8 27.2L14.2 29V33.2H31.5Z" 
      fill="url(#satinBlackBody)" 
      stroke="#090A0D" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />

    {/* Eye */}
    <circle cx="15.5" cy="14.5" r="0.8" fill="#717684" opacity="0.6" />
    
    {/* Nostril line */}
    <path d="M11.2 18.8C11.6 19.2 12.2 19.5 12.8 19.4" stroke="#5E6370" strokeWidth="0.6" opacity="0.8" />

    {/* Arched Neck Mane Highlights */}
    <path d="M22.8 9.2C23.8 12.0 27.2 15.5 29.5 19.5" stroke="#717684" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <path d="M21.0 7.2C21.8 8.8 24.2 11.0 25.5 13.0" stroke="#717684" strokeWidth="1.0" strokeLinecap="round" opacity="0.4" />

    {/* Jaw contour / muscle shadow overlay to look 3D */}
    <path d="M22.5 16.5C22.5 16.5 19.5 21.2 15.8 24.5" stroke="#717684" strokeWidth="0.8" opacity="0.3" />
  </svg>
);

export const BishopWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="bishopShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.54 0" />
      </filter>
      <linearGradient id="ivoryBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#FAF8F2" />
        <stop offset="65%" stopColor="#F1ECD8" />
        <stop offset="100%" stopColor="#DFD7BE" />
      </linearGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="14.5" ry="3.2" fill="#000000" filter="url(#bishopShadow)" />

    {/* Bottom Base Plinth */}
    <path d="M10.5 38.5C10.5 35 12.5 33 22.5 33C32.5 33 34.5 35 34.5 38.5H10.5Z" fill="url(#ivoryBody)" />
    
    {/* Upper Base Tier */}
    <path d="M12.5 33C12.5 29.5 15.5 28 22.5 28C29.5 28 32.5 29.5 32.5 33H12.5Z" fill="url(#ivoryBody)" />

    {/* Elegant Tapered Bishop Body Shaft */}
    <path d="M18 28L19.2 19H25.8L27 28H18Z" fill="url(#ivoryBody)" />

    {/* Double Collar neckband moulding */}
    <ellipse cx="22.5" cy="18.5" rx="5.5" ry="1.2" fill="url(#ivoryBody)" />
    <ellipse cx="22.5" cy="17.2" rx="4.8" ry="1.0" fill="url(#ivoryBody)" />

    {/* Traditional Bishop Teardrop Miter (Head) */}
    <path 
      d="M22.5 7.5C26.5 7.5 29 11 29 16C29 18 28 20 26.5 22C24.8 23.8 25.5 28 19.5 28C19.5 28 20.2 23.8 18.5 22C17 20 16 18 16 16C16 11 18.5 7.5 22.5 7.5Z" 
      fill="url(#ivoryBody)" 
      stroke="#C5BEAC" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />

    {/* Pro Slit cut exactly at an angle (standard custom bishop feature) */}
    <path 
      d="M20.2 9.5C21.2 13 25 15.5 27.5 16.8" 
      stroke="#78716C" 
      strokeWidth="1.2" 
      strokeLinecap="round" 
    />

    {/* Rounded ball finial tip matching the body ivory material */}
    <ellipse cx="22.5" cy="5.2" rx="1.8" ry="1.5" fill="url(#ivoryBody)" />
    <circle cx="21.8" cy="4.5" r="0.8" fill="#FFFFFF" opacity="0.7" />
  </svg>
);

export const BishopBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="bishopShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.54 0" />
      </filter>
      <linearGradient id="satinBlackBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#4A4E5A" />
        <stop offset="20%" stopColor="#252731" />
        <stop offset="60%" stopColor="#121319" />
        <stop offset="100%" stopColor="#0B0C0E" />
      </linearGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="14.5" ry="3.2" fill="#000000" filter="url(#bishopShadow)" />

    {/* Bottom Base Plinth */}
    <path d="M10.5 38.5C10.5 35 12.5 33 22.5 33C32.5 33 34.5 35 34.5 38.5H10.5Z" fill="url(#satinBlackBody)" />
    
    {/* Upper Base Tier */}
    <path d="M12.5 33C12.5 29.5 15.5 28 22.5 28C29.5 28 32.5 29.5 32.5 33H12.5Z" fill="url(#satinBlackBody)" />

    {/* Elegant Tapered Bishop Body Shaft */}
    <path d="M18 28L19.2 19H25.8L27 28H18Z" fill="url(#satinBlackBody)" />

    {/* Double Collar neckband moulding */}
    <ellipse cx="22.5" cy="18.5" rx="5.5" ry="1.2" fill="url(#satinBlackBody)" />
    <ellipse cx="22.5" cy="17.2" rx="4.8" ry="1.0" fill="url(#satinBlackBody)" />

    {/* Traditional Bishop Teardrop Miter (Head) */}
    <path 
      d="M22.5 7.5C26.5 7.5 29 11 29 16C29 18 28 20 26.5 22C24.8 23.8 25.5 28 19.5 28C19.5 28 20.2 23.8 18.5 22C17 20 16 18 16 16C16 11 18.5 7.5 22.5 7.5Z" 
      fill="url(#satinBlackBody)" 
      stroke="#090A0D" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />

    {/* Pro Slit cut exactly at an angle (standard custom bishop feature) */}
    <path 
      d="M20.2 9.5C21.2 13 25 15.5 27.5 16.8" 
      stroke="#121319" 
      strokeWidth="1.2" 
      strokeLinecap="round" 
    />

    {/* Rounded ball finial tip matching the body ivory material */}
    <ellipse cx="22.5" cy="5.2" rx="1.8" ry="1.5" fill="url(#satinBlackBody)" />
    <circle cx="21.8" cy="4.5" r="0.8" fill="#5E6370" opacity="0.5" />
  </svg>
);

export const QueenWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="queenShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.0" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.58 0" />
      </filter>
      <linearGradient id="ivoryBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#FAF8F2" />
        <stop offset="65%" stopColor="#F1ECD8" />
        <stop offset="100%" stopColor="#DFD7BE" />
      </linearGradient>
      <radialGradient id="ivoryGloss" cx="0.4" cy="0.25" r="0.5">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="15.5" ry="3.5" fill="#000000" filter="url(#queenShadow)" />

    {/* Weighted Dual Base */}
    <path d="M9.5 38.5C9.5 35 12.5 33 22.5 33C32.5 33 35.5 35 35.5 38.5H9.5Z" fill="url(#ivoryBody)" />
    <path d="M11 33C11 29 14.5 27.5 22.5 27.5C30.5 27.5 34 29 34 33H11Z" fill="url(#ivoryBody)" />

    {/* Tapered upper midsection shaft */}
    <path d="M15.5 28L17.5 19H27.5L29.5 28H15.5Z" fill="url(#ivoryBody)" />

    {/* Double Crown neckband collar */}
    <ellipse cx="22.5" cy="19.2" rx="7" ry="1.3" fill="url(#ivoryBody)" />
    <ellipse cx="22.5" cy="18.0" rx="6.2" ry="1.1" fill="url(#ivoryBody)" />

    {/* Beautifully fluted Staunton Crown with multiple spikes and round pearl tips */}
    <path 
      d="M11.5 14L14.8 24.8H30.2L33.5 14L28 19L22.5 11.2L17 19L11.5 14Z" 
      fill="url(#ivoryBody)" 
      stroke="#C5BEAC" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
    {/* Elegant fluting divisions shading line */}
    <path d="M22.5 11.2L22.5 24.8" stroke="#E6E0CB" strokeWidth="0.8" opacity="0.8" />
    <path d="M17 19L20 24.8" stroke="#E6E0CB" strokeWidth="0.6" opacity="0.6" />
    <path d="M28 19L25 24.8" stroke="#E6E0CB" strokeWidth="0.6" opacity="0.6" />

    {/* Prominent White Ivory crown pearl beads exactly matching the Staunton form */}
    <circle cx="11.5" cy="13.2" r="1.3" fill="url(#ivoryBody)" />
    <circle cx="17.0" cy="18.2" r="1.1" fill="url(#ivoryBody)" />
    <circle cx="22.5" cy="10.5" r="1.5" fill="url(#ivoryBody)" />
    <circle cx="28.0" cy="18.2" r="1.1" fill="url(#ivoryBody)" />
    <circle cx="33.5" cy="13.2" r="1.3" fill="url(#ivoryBody)" />

    {/* Specular gloss block */}
    <rect x="17.5" y="21.5" width="10" height="3" rx="1.5" fill="url(#ivoryGloss)" />
  </svg>
);

export const QueenBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="queenShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.0" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.58 0" />
      </filter>
      <linearGradient id="satinBlackBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#4A4E5A" />
        <stop offset="20%" stopColor="#252731" />
        <stop offset="60%" stopColor="#121319" />
        <stop offset="100%" stopColor="#0B0C0E" />
      </linearGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="15.5" ry="3.5" fill="#000000" filter="url(#queenShadow)" />

    {/* Weighted Dual Base */}
    <path d="M9.5 38.5C9.5 35 12.5 33 22.5 33C32.5 33 35.5 35 35.5 38.5H9.5Z" fill="url(#satinBlackBody)" />
    <path d="M11 33C11 29 14.5 27.5 22.5 27.5C30.5 27.5 34 29 34 33H11Z" fill="url(#satinBlackBody)" />

    {/* Tapered upper midsection shaft */}
    <path d="M15.5 28L17.5 19H27.5L29.5 28H15.5Z" fill="url(#satinBlackBody)" />

    {/* Double Crown neckband collar */}
    <ellipse cx="22.5" cy="19.2" rx="7" ry="1.3" fill="url(#satinBlackBody)" />
    <ellipse cx="22.5" cy="18.0" rx="6.2" ry="1.1" fill="url(#satinBlackBody)" />

    {/* Beautifully fluted Staunton Crown with multiple spikes and round pearl tips */}
    <path 
      d="M11.5 14L14.8 24.8H30.2L33.5 14L28 19L22.5 11.2L17 19L11.5 14Z" 
      fill="url(#satinBlackBody)" 
      stroke="#090A0D" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
    <path d="M22.5 11.2L22.5 24.8" stroke="#252731" strokeWidth="0.8" opacity="0.6" />

    {/* Prominent Obsidian Black crown pearl beads exactly matching the Staunton form */}
    <circle cx="11.5" cy="13.2" r="1.3" fill="url(#satinBlackBody)" />
    <circle cx="17.0" cy="18.2" r="1.1" fill="url(#satinBlackBody)" />
    <circle cx="22.5" cy="10.5" r="1.5" fill="url(#satinBlackBody)" />
    <circle cx="28.0" cy="18.2" r="1.1" fill="url(#satinBlackBody)" />
    <circle cx="33.5" cy="13.2" r="1.3" fill="url(#satinBlackBody)" />
  </svg>
);

export const KingWhite: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="kingShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.2" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.6 0" />
      </filter>
      <linearGradient id="ivoryBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#FAF8F2" />
        <stop offset="65%" stopColor="#F1ECD8" />
        <stop offset="100%" stopColor="#DFD7BE" />
      </linearGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="15.5" ry="3.5" fill="#000000" filter="url(#kingShadow)" />

    {/* Heavy Double-Tiered Base Plinth */}
    <path d="M9.5 38.5C9.5 35 12.5 33 22.5 33C32.5 33 35.5 35 35.5 38.5H9.5Z" fill="url(#ivoryBody)" />
    <path d="M11 33C11 29.5 14.5 28 22.5 28C30.5 28 34 29.5 34 33H11Z" fill="url(#ivoryBody)" />

    {/* Broad-shouldered Majestic Body Shaft */}
    <path 
      d="M14 28C14 23 16.5 19 22.5 19C28.5 19 31 23 31 28H14Z" 
      fill="url(#ivoryBody)" 
      stroke="#C5BEAC" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />

    {/* Robust neckband moulding collar typical of Staunton Kings */}
    <ellipse cx="22.5" cy="18.5" rx="7.8" ry="1.4" fill="url(#ivoryBody)" />
    <ellipse cx="22.5" cy="17.2" rx="7.0" ry="1.1" fill="url(#ivoryBody)" />

    {/* Top crown shoulder and dome casing */}
    <path 
      d="M13.5 17.2C13.5 13 16.5 10 22.5 10C28.5 10 31.5 13 31.5 17.2H13.5Z" 
      fill="url(#ivoryBody)" 
      stroke="#C5BEAC" 
      strokeWidth="0.5" 
    />

    {/* Solid Standard Beveled Cross finial crown piece (exactly as in the tournament image) */}
    {/* Clean geometric symmetry representing the iconic Staunton king cross */}
    <path 
      d="M21 4H24V6H26V8H24V10H21V8H19V6H21V4Z" 
      fill="url(#ivoryBody)" 
      stroke="#C5BEAC" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
    <line x1="22.5" y1="4.5" x2="22.5" y2="9.5" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
  </svg>
);

export const KingBlack: React.FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="kingShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.2" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.6 0" />
      </filter>
      <linearGradient id="satinBlackBody" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
        <stop offset="0%" stopColor="#4A4E5A" />
        <stop offset="20%" stopColor="#252731" />
        <stop offset="60%" stopColor="#121319" />
        <stop offset="100%" stopColor="#0B0C0E" />
      </linearGradient>
    </defs>

    <ellipse cx="22.5" cy="40.5" rx="15.5" ry="3.5" fill="#000000" filter="url(#kingShadow)" />

    {/* Heavy Double-Tiered Base Plinth */}
    <path d="M9.5 38.5C9.5 35 12.5 33 22.5 33C32.5 33 35.5 35 35.5 38.5H9.5Z" fill="url(#satinBlackBody)" />
    <path d="M11 33C11 29.5 14.5 28 22.5 28C30.5 28 34 29.5 34 33H11Z" fill="url(#satinBlackBody)" />

    {/* Broad-shouldered Majestic Body Shaft */}
    <path 
      d="M14 28C14 23 16.5 19 22.5 19C28.5 19 31 23 31 28H14Z" 
      fill="url(#satinBlackBody)" 
      stroke="#090A0D" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />

    {/* Robust neckband moulding collar typical of Staunton Kings */}
    <ellipse cx="22.5" cy="18.5" rx="7.8" ry="1.4" fill="url(#satinBlackBody)" />
    <ellipse cx="22.5" cy="17.2" rx="7.0" ry="1.1" fill="url(#satinBlackBody)" />

    {/* Top crown shoulder and dome casing */}
    <path 
      d="M13.5 17.2C13.5 13 16.5 10 22.5 10C28.5 10 31.5 13 31.5 17.2H13.5Z" 
      fill="url(#satinBlackBody)" 
      stroke="#090A0D" 
      strokeWidth="0.5" 
    />

    {/* Solid Standard Beveled Cross finial crown piece (exactly as in the tournament image) */}
    <path 
      d="M21 4H24V6H26V8H24V10H21V8H19V6H21V4Z" 
      fill="url(#satinBlackBody)" 
      stroke="#090A0D" 
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const renderPiece = (type: string, color: string, className?: string) => {
  const normType = type.toLowerCase();
  if (color === 'w') {
    switch (normType) {
      case 'p': return <PawnWhite className={className} />;
      case 'r': return <RookWhite className={className} />;
      case 'n': return <KnightWhite className={className} />;
      case 'b': return <BishopWhite className={className} />;
      case 'q': return <QueenWhite className={className} />;
      case 'k': return <KingWhite className={className} />;
    }
  } else {
    switch (normType) {
      case 'p': return <PawnBlack className={className} />;
      case 'r': return <RookBlack className={className} />;
      case 'n': return <KnightBlack className={className} />;
      case 'b': return <BishopBlack className={className} />;
      case 'q': return <QueenBlack className={className} />;
      case 'k': return <KingBlack className={className} />;
    }
  }
  return null;
};
