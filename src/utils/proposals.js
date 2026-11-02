export function proposalDraft(proposal) {
  const shortlist = {};
  if (Array.isArray(proposal.vendorShortlist)) {
    for (const group of proposal.vendorShortlist) shortlist[group.category] = group.vendors || [];
  } else if (proposal.vendorShortlist && typeof proposal.vendorShortlist === 'object') {
    Object.assign(shortlist, proposal.vendorShortlist);
  }
  const vendorShortlist = Object.fromEntries(Object.entries(shortlist).map(([category, values]) => [category,
    (Array.isArray(values) ? values : []).map(value => Number(value?.id ?? value))
      .filter(value => Number.isSafeInteger(value) && value > 0),
  ]));
  return {
    venueId: proposal.venueId?.toString() || '',
    pricingTier: proposal.pricingTier || 'basic',
    customPrice: proposal.price == null ? '' : String(proposal.price),
    terms: proposal.terms || '', vendorShortlist,
  };
}
