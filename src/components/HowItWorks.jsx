import React from 'react'

const steps = [
  { title: 'Create an Account', text: 'Sign up to build your profile and set up your preferences.' },
  { title: 'Add Your Dogs', text: 'Create detailed profiles with traits and health records.' },
  { title: 'Find Matches', text: 'Use our trait compatibility tool to find ideal breeding matches.' },
  { title: 'Connect', text: 'Message other breeders and arrange screenings/interviews with confidence.' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl sm:text-2xl font-bold text-slate-900">How DaBreeder Works</h2>
        <p className="mt-1 text-center text-sm text-slate-600 max-w-2xl mx-auto">
          Getting started is easy. Follow these simple steps to begin your breeding journey with us.
        </p>

        {/* Steps */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-slate-300 text-blue-600">
                {i + 1}
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
