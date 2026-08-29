// Map service category to checklist item names
const categoryToChecklistMap = {
  av: 'Arrange AV equipment',
  catering: 'Arrange catering service',
  security: 'Arrange security',
  cleaning: 'Arrange cleaning services',
  photography: 'Arrange photography',
  music: 'Book music / DJ',
};

export const deriveChecklist = (event, assignments) => {
  const acceptedCategories = assignments
    .filter(a => a.eventId === event.id && a.status === 'ACCEPTED')
    .map(a => a.serviceCategory);

  return event.checklist.map(item => {
    const matchingCategory = Object.keys(categoryToChecklistMap).find(
      cat => categoryToChecklistMap[cat] === item.itemName
    );
    if (matchingCategory) {
      const isComplete = acceptedCategories.includes(matchingCategory);
      return { ...item, isComplete };
    }
    return item;
  });
};