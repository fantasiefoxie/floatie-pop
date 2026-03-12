export const FOOD = ["🍫", "🧇", "🍝", "🍕"];
export const FLOWERS = ["🌹", "🌻", "💋"];
export const HUMAN = ["👩", "👨", "🧑", "👧", "👦"];
export const ANIMALS = ["😺", "🦊", "🐢", "🐱", "🧸"];
export const ALL = [...FOOD, ...FLOWERS, ...HUMAN, ...ANIMALS];

export const BASE_CARDS = [
  ["Central Perk Hearts", "Love"], ["Smelly Cat Serenade", "Chaos"], ["Blue French Horn", "Love"],
  ["Mischief Managed Kiss", "Dream"], ["Sparkling Twilight Glow", "Dream"],
  ["Severance Memory Split", "Memory"], ["Midnight Weeknd Mood", "Dream"],
  ["Kanye Heart Bear", "Chaos"], ["Modern Family Chaos Love", "Love"],
  ["Yellow Umbrella Promise", "Dream"], ["Always Patronus", "Memory"],
  ["Forks Moonlight", "Memory"], ["Macrodata Feelings", "Chaos"],
  ["Graduation Bear Hug", "Dream"], ["Dunphy Love Logic", "Memory"],
  ["Phoebe Soul Energy", "Chaos"], ["Potion Class Crush", "Dream"],
  ["Volturi Glance", "Chaos"], ["Outie/Innie Connection", "Memory"],
  ["Blinding Lights Bloom", "Dream"]
];

export const CARD_POOL = [...Array(76)].map((_, i) => {
  const b = BASE_CARDS[i % BASE_CARDS.length];
  return {
    name: b[0] + " " + (Math.floor(i / BASE_CARDS.length) + 1),
    arcana: b[1],
    charm: 58 + (i * 3) % 40,
    power: 55 + (i * 5) % 40,
    quote: ["I'll be there for you.", "Always.", "Mischief managed.", "Blinding lights."][i % 4],
    flavor: ["Cozy energy", "Romantic chaos", "Magic destiny", "Neon dream"][i % 4]
  };
});
