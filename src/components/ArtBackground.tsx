import React from 'react';

export const ArtBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-40">
      {/* Halftone subtle dot pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(#111111 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px',
          opacity: 0.12,
        }}
      />

      {/* Pop Art Organic Star bursts and graphic accents */}
      {/* Top right energy splash */}
      <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-[#FFD21F] opacity-30 blur-2xl transform rotate-12" />

      {/* Top left electric burst */}
      <div className="absolute top-40 -left-20 w-72 h-72 rounded-full bg-[#2457FF] opacity-20 blur-3xl" />

      {/* Center magenta flash */}
      <div className="absolute top-1/2 right-10 w-64 h-64 rounded-full bg-[#E83DFF] opacity-20 blur-3xl" />

      {/* Bottom orange pulse */}
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-[#FF6A00] opacity-25 blur-3xl" />

      {/* Floating vector stickers & starbursts */}
      <svg
        className="absolute top-28 right-8 w-12 h-12 text-[#FF6A00] animate-pulse"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
      </svg>

      <svg
        className="absolute top-96 left-6 w-8 h-8 text-[#2457FF] opacity-75 transform rotate-45"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
      </svg>

      <svg
        className="absolute bottom-40 right-12 w-10 h-10 text-[#FFD21F] transform -rotate-12"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0L15.1 8.9L24 12L15.1 15.1L12 24L8.9 15.1L0 12L8.9 8.9L12 0Z" />
      </svg>
    </div>
  );
};
