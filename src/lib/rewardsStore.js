const STORAGE_KEY = 'pc_quick_rewards';

const DEFAULT_REWARDS = [
  { id: '1', label: 'Free Drink', points: 100 },
  { id: '2', label: '$5 Off', points: 500 },
  { id: '3', label: '$10 Off', points: 1000 },
];

export function getRewards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REWARDS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_REWARDS;
  }
}

export function saveRewards(rewards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rewards));
}

export function addReward(reward) {
  const rewards = getRewards();
  const newReward = { ...reward, id: Date.now().toString() };
  saveRewards([...rewards, newReward]);
  return newReward;
}

export function updateReward(id, data) {
  const rewards = getRewards().map((r) => (r.id === id ? { ...r, ...data } : r));
  saveRewards(rewards);
}

export function deleteReward(id) {
  saveRewards(getRewards().filter((r) => r.id !== id));
}