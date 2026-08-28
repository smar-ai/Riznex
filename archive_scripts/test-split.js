const isHerbies = true;
const is2025 = false;

const getSplit = (text) => {
  const t = (text || '').toLowerCase()
  const matchesHerbies = t.includes('herbies')
  const matchesTasty = t.includes('tasty')
  
  if (isHerbies && matchesHerbies) return 1
  if (!isHerbies && matchesTasty) return 1
  if (isHerbies && matchesTasty) return 0
  if (!isHerbies && matchesHerbies) return 0
  
  return is2025 ? 1 : 0.5
}

const e = {
  category: 'fees',
  subcategory: 'Tasty Bun Andromeda POS Fee',
  notes: 'Fixed weekly cost',
  amount: 40
};

const split = getSplit(`${e.category} ${e.subcategory || ''} ${e.notes || ''}`);
console.log(`Split is: ${split}`);
console.log(`Final amount is: ${e.amount * split}`);
