// @ts-nocheck
// FoodHub category lists mirror the structured Food & Drinks seller-center listing flow.

export const getFoodCategories = (userCity) => {
  const localLabel = userCity ? `Local - ${userCity}` : 'Local';
  const localIcon = '📍';

  return [
    { id: 'all', label: 'All', icon: '🍽️' },
    { id: 'local', label: localLabel, icon: localIcon },
    { id: 'Fresh Produce', label: 'Fresh Produce', icon: '🥬' },
    { id: 'Meat & Poultry', label: 'Meat & Poultry', icon: '🍗' },
    { id: 'Seafood', label: 'Seafood', icon: '🐟' },
    { id: 'Dairy & Eggs', label: 'Dairy & Eggs', icon: '🥚' },
    { id: 'Bakery', label: 'Bakery', icon: '🥐' },
    { id: 'Pantry Staples', label: 'Pantry', icon: '🥫' },
    { id: 'Snacks & Confectionery', label: 'Snacks', icon: '🍫' },
    { id: 'Frozen Food', label: 'Frozen', icon: '🧊' },
    { id: 'Ready Meals', label: 'Ready Meals', icon: '🍱' },
    { id: 'Special Diets', label: 'Special Diets', icon: '🌱' },
  ];
};

export const DRINK_CATEGORIES = [
  { id: 'all', label: 'All', icon: '🥤' },
  { id: 'Water', label: 'Water', icon: '💧' },
  { id: 'Soft Drinks', label: 'Soft Drinks', icon: '🥤' },
  { id: 'Juices', label: 'Juices', icon: '🧃' },
  { id: 'Energy Drinks', label: 'Energy', icon: '⚡' },
  { id: 'Coffee', label: 'Coffee', icon: '☕' },
  { id: 'Tea', label: 'Tea', icon: '🍵' },
  { id: 'Plant-Based Milk', label: 'Plant Milk', icon: '🌾' },
  { id: 'Alcoholic', label: 'Alcoholic', icon: '🍷' },
  { id: 'Hot Chocolate / Other Hot Drinks', label: 'Hot Drinks', icon: '🍫' },
];
