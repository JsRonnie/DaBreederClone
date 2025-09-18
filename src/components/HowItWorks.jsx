import React from 'react'

const steps = [
  { title: 'Create an Account', text: 'Sign up to build your profile and set up your preferences.' },
  { title: 'Add Your Dogs', text: 'Create detailed profiles with traits and health records.' },
  { title: 'Find Matches', text: 'Use our trait compatibility tool to find ideal breeding matches.' },
  { title: 'Connect', text: 'Message other breeders and arrange screenings/interviews with confidence.' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="py-16 sm:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">How DaBreeder Works</h2>
        <p className="mt-4 text-center text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          Getting started is easy. Follow these simple steps to begin your breeding journey with us.
        </p>

        {/* Steps */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="text-center">
              <div className="mx-auto flex size-12 lg:size-14 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
                {i + 1}
              </div>
              <h3 className="mt-4 font-semibold text-lg text-slate-900">{s.title}</h3>
              <p className="mt-2 text-base text-slate-600 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
