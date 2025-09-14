import React from 'react'

export default function Community() {
  return (
    <section id="community" className="bg-blue-600">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16 text-center">
        <h2 className="text-white text-xl sm:text-2xl font-bold">Join Our Growing Community</h2>
        <p className="mt-2 text-blue-50 max-w-2xl mx-auto">
          Join thousands of professional and hobby breeders who are already using DaBreeder to find the perfect matches for their dogs.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="#signup" className="inline-flex items-center rounded-md bg-white px-4 py-2 font-medium text-blue-700 shadow hover:bg-blue-50">
            Sign Up Now
          </a>
          <a href="#learn" className="inline-flex items-center rounded-md border border-white/70 px-4 py-2 font-medium text-white hover:bg-white/10">
            Learn More
          </a>
        </div>
      </div>
    </section>
  )
}
