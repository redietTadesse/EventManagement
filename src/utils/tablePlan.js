export const roundTableSizes = {
  BANQUET: [6, 8, 10],
  CABARET: [4, 5, 6],
};
export const defaultTablePlaces = { BANQUET:8, CABARET:5 };

export function estimateTables(guests, seatsPerTable) {
  const count = Number(guests);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(seatsPerTable) || seatsPerTable < 1) return null;
  const tables = Math.ceil(count / seatsPerTable);
  const smaller = Math.floor(count / tables);
  const largerTables = count % tables;
  const groups = [{ tables: tables - largerTables, guests: smaller }];
  if (largerTables) groups.push({ tables: largerTables, guests: smaller + 1 });
  return { tables, groups };
}

export function tableDistribution(estimate) {
  return estimate.groups.map(group =>
    `${group.tables.toLocaleString()} ${group.tables === 1 ? 'table' : 'tables'} of ${group.guests}`
  ).join(' and ');
}
