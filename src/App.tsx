import { useState } from "react";
import Card, { type CardRarity } from "./Card/Card";

const REPO_URL = "https://factblock-kurt.github.io/kbw2026-photo-card-pos";

const CARD_TYPES: { rarity: CardRarity; label: string; image: string }[] = [
  { rarity: "common", label: "Common & Uncommon", image: "temp.webp" },
  { rarity: "rare", label: "Holofoil Rare", image: "temp2.webp" },
  { rarity: "legendary", label: "Radiant Holofoil", image: "temp.webp" },
  { rarity: "unique", label: "Galaxy/Cosmos Holofoil", image: "temp.webp" },
  { rarity: "epic", label: "Pokemon V", image: "temp2.webp" },
];

// ?mode=touch → 시안 2(터치), 그 외 → 시안 1(자이로)
const mode =
  new URLSearchParams(window.location.search).get("mode") === "touch"
    ? "touch"
    : "gyro";

export default function App() {
  return mode === "touch" ? <TouchDemo /> : <GyroDemo />;
}

function RaritySelector({
  value,
  onChange,
}: {
  value: CardRarity;
  onChange: (rarity: CardRarity) => void;
}) {
  return (
    <fieldset style={{ border: "none", padding: 0, margin: "12px 0" }}>
      {CARD_TYPES.map((t) => (
        <label key={t.rarity} style={{ marginRight: 16 }}>
          <input
            type="radio"
            name="rarity"
            value={t.rarity}
            checked={value === t.rarity}
            onChange={() => onChange(t.rarity)}
          />{" "}
          {t.label}
        </label>
      ))}
    </fieldset>
  );
}

/** 시안 1 — 카드 상세 뷰: 기기 기울기(자이로)에 반응하는 홀로그램 카드 */
function GyroDemo() {
  const [gyroOn, setGyroOn] = useState(false);
  const [rarity, setRarity] = useState<CardRarity>("epic");
  const selected = CARD_TYPES.find((t) => t.rarity === rarity)!;

  const toggleGyro = async () => {
    if (gyroOn) {
      setGyroOn(false);
      return;
    }
    // iOS 13+는 사용자 제스처(버튼 탭) 안에서만 권한 요청 가능
    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof doe.requestPermission === "function") {
      try {
        if ((await doe.requestPermission()) !== "granted") {
          alert("기울기 센서 권한이 거부되어 터치 모드로 동작합니다.");
          return;
        }
      } catch {
        alert("기울기 센서 권한을 요청할 수 없습니다. 터치 모드로 동작합니다.");
        return;
      }
    }
    setGyroOn(true);
  };

  return (
    <div>
      <h1>KBW 2026 Photo Card POS</h1>
      <p>
        시안 1 — 기기 기울기(자이로) 반응 ·{" "}
        <a href="?mode=touch">시안 2(터치) 보기</a>
      </p>
      <button onClick={toggleGyro}>
        {gyroOn ? "📱 기울기 모드 끄기" : "📱 기울기 모드 켜기"}
      </button>
      <p>
        iOS는 버튼을 눌러 센서 권한을 허용해야 합니다. 미지원·권한 거부
        기기에서는 터치(드래그)로 동작합니다.
      </p>
      <RaritySelector value={rarity} onChange={setRarity} />
      <Card
        key={rarity}
        imageUrl={`${REPO_URL}/images/${selected.image}`}
        rarity={rarity}
        gyro={gyroOn}
      />
    </div>
  );
}

/** 시안 2 — 터치/마우스 반응 버전 */
function TouchDemo() {
  const [rarity, setRarity] = useState<CardRarity>("epic");
  const selected = CARD_TYPES.find((t) => t.rarity === rarity)!;

  return (
    <div>
      <h1>KBW 2026 Photo Card POS</h1>
      <p>
        시안 2 — 터치/마우스 반응 · <a href="?">시안 1(자이로) 보기</a>
      </p>
      <RaritySelector value={rarity} onChange={setRarity} />
      <Card
        key={rarity}
        imageUrl={`${REPO_URL}/images/${selected.image}`}
        rarity={rarity}
      />
    </div>
  );
}
