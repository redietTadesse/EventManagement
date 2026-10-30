export const eventCategoryMap = {
  conference: ['av', 'catering', 'security'],
  wedding: ['catering', 'photography', 'music'],
  trade_show: ['av', 'security', 'cleaning'],
  exhibition: ['av', 'security', 'cleaning'],
  concert: ['av', 'security', 'music'],
  gala: ['catering', 'photography', 'music', 'security'],
  seminar: ['av', 'catering'],
};

export const pricingTiers = {
  basic: { multiplier: 1.0, name: 'Standard', description: 'Basic services included' },
  premium: { multiplier: 1.3, name: 'Premium', description: 'Enhanced services and priority support' },
  deluxe: { multiplier: 1.6, name: 'Deluxe', description: 'Full service package with dedicated coordinator' },
};
