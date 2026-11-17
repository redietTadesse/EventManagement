const steps = [
  ['Send an inquiry', 'Tell us your preferred dates, how many guests you expect, and what you need.'],
  ['Review your proposal', 'Your coordinator sends a proposal with the venue and pricing. You can accept it or ask for changes.'],
  ['Confirm your booking', 'Sign the agreement and submit your payment receipt. Your coordinator checks the receipt and reserves the venue.'],
];

export default function BookingWalkthrough() {
  return <ol className="mt-7 grid gap-5 sm:grid-cols-3">
    {steps.map(([title, description], index) => <li key={title} className="rounded-xl border border-[#d5ded5] bg-white p-5">
      <span className="eyebrow" aria-hidden="true">0{index + 1}</span>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </li>)}
  </ol>;
}
