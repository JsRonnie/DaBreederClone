import React from 'react'

const items = [
  {
    title: 'Trait Compatibility Tool',
    desc:
      'Create detailed dog profiles with traits like breed, age, size, and temperament. Find compatible matches quickly and responsibly.',
    icon: (
      <span className="text-lg">🐾</span>
    ),
  },
  {
    title: 'Health Record System',
    desc:
      'Securely store and view health certifications, vaccination records, and test results. Ensure transparency and healthy breeding practices.',
    icon: (
      <span className="text-lg">🩺</span>
    ),
  },
  {
    title: 'Breeder Forum',
    desc:
      'Connect with fellow breeders, share experiences, ask questions, and receive advice from experts in our active community forums.',
    icon: (
      <span className="text-lg">💬</span>
    ),
  },
  {
    title: 'Realtime Breeder Chat',
    desc:
      'Connect instantly with breeders through secure chat. Share details, discuss matches, and build trust before moving forward.',
    icon: (
      <span className="text-lg">💡</span>
    ),
  },
]

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">Key Features</h2>
        <p className="mt-4 text-center text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          Discover the powerful tools and features that make DaBreeder the leading platform for dog breeders.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {items.map((it) => (
            <article key={it.title} className="rounded-xl border border-slate-200 bg-white p-6 lg:p-8 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-xl">
                  {it.icon}
                </div>
                <h3 className="font-semibold text-lg text-slate-900">{it.title}</h3>
              </div>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">{it.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
