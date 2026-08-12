import Card from "./Card/Card";

const REPO_URL = "https://factblock-kurt.github.io/kbw2026-photo-card-pos";

export default function App() {
  return (
    <div>
      <h1>KBW 2026 Photo Card POS</h1>
      <p>Common & Uncommon</p>
      <Card imageUrl={`${REPO_URL}/images/temp3.png`} rarity="common" />
      <p>Holofoil Rare</p>
      <Card imageUrl={`${REPO_URL}/images/temp3.png`} rarity="rare" />
      <p>Radiant Holofoil</p>
      <Card imageUrl={`${REPO_URL}/images/temp3.png`} rarity="legendary" />
      <p>Galaxy/Cosmos Holofoil</p>
      <Card imageUrl={`${REPO_URL}/images/temp.png`} rarity="unique" />
      <p>Pokemon V</p>
      <Card imageUrl={`${REPO_URL}/images/temp3.png`} rarity="epic" />
    </div>
  );
}
