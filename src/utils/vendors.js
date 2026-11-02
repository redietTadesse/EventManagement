export function normalizeVendor(vendor) {
  return { ...vendor, isActive: vendor.active ?? vendor.isActive ?? false };
}

export function vendorUpdate(form) {
  return {
    companyName: form.companyName.trim(), serviceCategory: form.serviceCategory,
    email: form.email.trim(), phone: form.phone.trim(), description: form.description,
    insuranceExpiryDate: form.insuranceExpiryDate || null,
  };
}
