export function recoveryChoice(vendors, selectedId, reason, loading, loadError) {
  const vendor = vendors.find(candidate => String(candidate.id ?? candidate.vendorId) === String(selectedId));
  const id = Number(vendor?.id ?? vendor?.vendorId);
  const note = reason?.trim() || '';
  return { vendor, vendorId: id, reason: note, ready: !loading && !loadError && Number.isSafeInteger(id) && id > 0 && note.length > 0 && note.length <= 500 };
}
