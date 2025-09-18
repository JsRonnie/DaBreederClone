import React from 'react'

export default function Hero({ onGetStarted }) {
  return (
    <section
      id="hero"
      className="relative h-screen min-h-[500px] max-h-[800px] w-full overflow-hidden"
    >
      {/* Background image */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/heroPup.jpg')] bg-cover bg-center"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center text-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            Welcome to DaBreeder
          </h1>
          <p className="mt-4 sm:mt-6 text-white/90 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
            Helping you find the right match for your dogs, responsibly and with care.
          </p>
          <div className="mt-8 sm:mt-10">
            <button
              type="button"
              onClick={() => onGetStarted && onGetStarted()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50 transition-all duration-200 transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
