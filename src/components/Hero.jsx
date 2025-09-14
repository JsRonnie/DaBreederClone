import React from 'react'

export default function Hero({ onGetStarted }) {
  return (
    <section
      id="hero"
      className="relative h-[420px] sm:h-[520px] md:h-[560px] lg:h-[600px] w-full overflow-hidden"
    >
      {/* Background image */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
        <div className="max-w-2xl">
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Welcome to DaBreeder
          </h1>
          <p className="mt-3 sm:mt-4 text-white/90 text-sm sm:text-base md:text-lg">
            A platform for responsible dog breeding, genetic matching, and health record verification
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => onGetStarted && onGetStarted()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
