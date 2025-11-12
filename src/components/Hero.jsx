import React from "react";

export default function Hero({ onGetStarted }) {
  return (
    <section
      id="hero"
      className="relative h-screen min-h-[600px] max-h-[900px] w-full overflow-hidden"
    >
      {/* Background image with better overlay */}
      <div aria-hidden className="absolute inset-0 bg-[url('/heroPup.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/30" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight mb-8 drop-shadow-2xl">
              DaBreeder
            </h1>
            <div className="w-24 h-0.5 bg-gradient-to-r from-white/60 to-white/20 mx-auto mb-8"></div>
          </div>

          <p className="text-white text-xl sm:text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed font-semibold drop-shadow-lg">
            Find the perfect breeding match for your beloved dog
          </p>

          <p className="mt-6 text-white/95 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-md">
            Join our warm community of caring, responsible breeders and use our smart matching
            system to create healthier, happier puppies with love.
          </p>

          <div className="mt-12 space-y-6">
            <button
              type="button"
              onClick={() => onGetStarted && onGetStarted()}
              className="group relative inline-flex items-center justify-center px-12 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all duration-300 transform hover:scale-105 shadow-2xl"
              aria-label="Start your breeding journey today"
            >
              <span className="relative z-10">Start Your Journey Today</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-full transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60">
        <div className="flex flex-col items-center">
          <span className="text-sm font-light mb-2">Scroll to explore</span>
          <svg
            className="w-6 h-6 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
