import React from 'react'

const items = [
  {
    title: 'Trait Compatibility Tool',
    desc:
      'Match dogs based on genetics and traits to find the best breeding partners. Our advanced algorithms consider over 50 factors for optimal compatibility.',
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
]

export default function Features() {
  return (
    <section id="features" className="py-14 sm:py-16 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl sm:text-2xl font-bold text-slate-900">Key Features</h2>
        <p className="mt-1 text-center text-sm text-slate-600 max-w-2xl mx-auto">
          Discover the powerful tools and features that make DaBreeder the leading platform for dog breeders.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((it) => (
            <article key={it.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-slate-100 text-slate-900">
                  {it.icon}
                </div>
                <h3 className="font-semibold text-slate-900">{it.title}</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">{it.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
