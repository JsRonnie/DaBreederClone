import React from 'react'

export default function Community() {
  return (
    <section id="community" className="bg-blue-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">Join Our Growing Community</h2>
        <p className="mt-4 text-blue-50 text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
          Join thousands of professional and hobby breeders who are already using DaBreeder to find the perfect matches for their dogs.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a href="#signup" className="inline-flex items-center rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-all duration-200 transform hover:scale-105">
            Sign Up Now
          </a>
          <a href="#learn" className="inline-flex items-center rounded-lg border-2 border-white/70 px-8 py-4 text-lg font-semibold text-white hover:bg-white/10 transition-all duration-200">
            View Forums
          </a>
        </div>
      </div>
    </section>
  )
}
