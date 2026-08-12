import { useState } from "react";
import Card from "./Card/Card";

const REPO_URL = "https://factblock-kurt.github.io/kbw2026-photo-card-pos";

// ?mode=touch → 시안 2(터치), 그 외 → 시안 1(자이로)
const mode =
  new URLSearchParams(window.location.search).get("mode") === "touch"
    ? "touch"
    : "gyro";

export default function App() {
  return mode === "touch" ? <TouchDemo /> : <GyroDemo />;
}

/** 시안 1 — 카드 상세 뷰: 기기 기울기(자이로)에 반응하는 홀로그램 카드 1장 */
function GyroDemo() {
  const [gyroOn, setGyroOn] = useState(false);

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
      <Card imageUrl={`${REPO_URL}/images/temp2.png`} rarity="epic" gyro={gyroOn} />
    </div>
  );
}

/** 시안 2 — 터치/마우스 반응 버전 (레어도별 연출 목록) */
function TouchDemo() {
  return (
    <div>
      <h1>KBW 2026 Photo Card POS</h1>
      <p>
        시안 2 — 터치/마우스 반응 · <a href="?">시안 1(자이로) 보기</a>
      </p>
      <p>Common & Uncommon</p>
      <Card imageUrl={`${REPO_URL}/images/temp.png`} rarity="common" />
      <p>Holofoil Rare</p>
      <Card imageUrl={`${REPO_URL}/images/temp2.png`} rarity="rare" />
      <p>Radiant Holofoil</p>
      <Card imageUrl={`${REPO_URL}/images/temp.png`} rarity="legendary" />
      <p>Galaxy/Cosmos Holofoil</p>
      <Card imageUrl={`${REPO_URL}/images/temp.png`} rarity="unique" />
      <p>Pokemon V</p>
      <Card imageUrl={`${REPO_URL}/images/temp2.png`} rarity="epic" />
    </div>
  );
}
