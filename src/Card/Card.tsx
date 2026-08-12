import { useEffect, useRef, useState } from "react";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { CARD_ASPECT_RATIO } from "../constants";
import "./Card.css";
import "./Rare.css";
import "./Unique.css";
import "./Legendary.css";
import "./Epic.css";

export type CardRarity =
  | "common"
  | "rare"
  | "unique"
  | "legendary"
  | "epic"

type Props = {
  imageUrl: string;
  rarity: CardRarity;
  /** 기기 기울기(자이로)에 반응하는 모드. iOS 13+는 사전에 권한 허용 필요 */
  gyro?: boolean;
};

// 카드 크기와 무관한 최대 기울기 각도
const MAX_ROTATE_X = 20;
const MAX_ROTATE_Y = 15;
const PERSPECTIVE = 800;
// 기기를 이 각도(deg)만큼 기울이면 연출이 최대치에 도달
const GYRO_TILT_RANGE = 25;
// 이 각도(deg) 미만은 평평한 상태로 간주 — 센서 노이즈로 홀로그램이 남지 않게
const GYRO_DEADZONE = 5;
// 연출이 켜지는 기준은 데드존보다 살짝 높게(히스테리시스) 잡아 경계에서 깜빡임 방지
const GYRO_ACTIVATE = 8;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export default function Card({ imageUrl, rarity, gyro = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [isActive, setIsActive] = useState(false);

  // 원본 값
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);

  // 스프링 적용 (부드럽게)
  const rotateX = useSpring(mvX, { stiffness: 180, damping: 18 });
  const rotateY = useSpring(mvY, { stiffness: 180, damping: 18 });

  // 카드 표면 좌표(%)를 받아 shine/glare용 CSS 변수를 갱신
  const applySurfacePointer = (px: number, py: number) => {
    const card = cardRef.current;
    if (!card) return;

    const pointerFromLeft = px / 100;
    const pointerFromTop = py / 100;
    const pointerFromCenter = Math.min(
      1,
      Math.hypot(pointerFromLeft - 0.5, pointerFromTop - 0.5) * 2
    );

    // 배경(홀로 빔) 이동은 원본 pokemon-cards-css처럼 좁은 범위로 압축해서
    // 커서와 따로 노는 느낌 없이 은은하게 시차(패럴랙스)만 주도록 한다
    const bgX = 37 + (px * (63 - 37)) / 100;
    const bgY = 33 + (py * (67 - 33)) / 100;

    card.style.setProperty("--pointer-x", `${px}%`);
    card.style.setProperty("--pointer-y", `${py}%`);
    card.style.setProperty("--pointer-from-left", `${pointerFromLeft}`);
    card.style.setProperty("--pointer-from-top", `${pointerFromTop}`);
    card.style.setProperty("--pointer-from-center", `${pointerFromCenter}`);
    card.style.setProperty("--background-x", `${bgX}%`);
    card.style.setProperty("--background-y", `${bgY}%`);
  };
  const applySurfacePointerRef = useRef(applySurfacePointer);
  applySurfacePointerRef.current = applySurfacePointer;

  // 커서의 화면 좌표를 3D 회전·원근이 적용된 카드 표면 좌표로 역투영.
  // transform = perspective(d) rotateX(θ) rotateY(φ) 의 역산이라
  // 카드가 기울어져 있어도 shine/glare가 정확히 커서 밑에 온다.
  const updateShine = () => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    const pointer = lastPointerRef.current;
    if (!wrap || !card || !pointer) return;

    const rect = wrap.getBoundingClientRect();
    // 카드 중심(= transform origin) 기준 화면 좌표
    const sx = pointer.x - (rect.left + rect.width / 2);
    const sy = pointer.y - (rect.top + rect.height / 2);

    // 현재 렌더링 중인(스프링이 적용된) 각도 기준
    const rx = (rotateX.get() * Math.PI) / 180;
    const ry = (rotateY.get() * Math.PI) / 180;
    const cosRX = Math.cos(rx);
    const sinRX = Math.sin(rx);
    const cosRY = Math.cos(ry);
    const sinRY = Math.sin(ry);
    const d = PERSPECTIVE;

    // 표면 좌표 (u, v)에 대한 2x2 선형계 풀이
    const a = d * cosRY - sx * sinRY * cosRX;
    const b = sx * sinRX;
    const c = sinRY * (d * sinRX - sy * cosRX);
    const f = d * cosRX + sy * sinRX;
    const det = a * f - b * c;
    if (Math.abs(det) < 1e-6) return;

    const u = (d * (sx * f - sy * b)) / det;
    const v = (d * (sy * a - sx * c)) / det;

    const px = clamp(((u + rect.width / 2) / rect.width) * 100, 0, 100);
    const py = clamp(((v + rect.height / 2) / rect.height) * 100, 0, 100);

    applySurfacePointer(px, py);
  };
  const updateShineRef = useRef(updateShine);
  updateShineRef.current = updateShine;

  // 스프링으로 카드가 계속 회전하는 동안에도 shine이 커서 밑에 붙어 있도록
  useEffect(() => {
    const onChange = () => updateShineRef.current();
    const unsubX = rotateX.on("change", onChange);
    const unsubY = rotateY.on("change", onChange);
    return () => {
      unsubX();
      unsubY();
    };
  }, [rotateX, rotateY]);

  // 자이로 모드: 기기 기울기를 tilt + 가상 표면 포인터로 변환
  useEffect(() => {
    if (!gyro) return;

    // 모드 켠 시점의 자세를 0점으로 캘리브레이션
    let baseline: { beta: number; gamma: number } | null = null;
    // 히스테리시스 상태: 데드존을 확실히 벗어나야 켜지고, 다시 들어와야 꺼짐
    let engaged = false;

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (baseline === null) baseline = { beta: e.beta, gamma: e.gamma };

      const dBeta = e.beta - baseline.beta; // 앞뒤 기울기
      const dGamma = e.gamma - baseline.gamma; // 좌우 기울기

      // 화면 회전(가로/세로)에 맞춰 축 정렬
      const angle = screen.orientation?.angle ?? 0;
      let tx: number;
      let ty: number;
      if (angle === 90) {
        tx = dBeta;
        ty = -dGamma;
      } else if (angle === 270) {
        tx = -dBeta;
        ty = dGamma;
      } else if (angle === 180) {
        tx = -dGamma;
        ty = -dBeta;
      } else {
        tx = dGamma;
        ty = dBeta;
      }

      // 데드존: 테이블에 올려둔 정도의 미세한 기울기는 평평한 것으로 처리
      const mag = Math.hypot(tx, ty);
      engaged = engaged ? mag > GYRO_DEADZONE : mag > GYRO_ACTIVATE;

      // 포인터 기반 shine 갱신과 충돌하지 않도록 마지막 커서 좌표를 비움
      lastPointerRef.current = null;

      if (!engaged) {
        setIsActive(false);
        mvX.set(0);
        mvY.set(0);
        applySurfacePointerRef.current(50, 50);
        return;
      }
      setIsActive(true);

      // 데드존을 뺀 나머지 구간을 0~1로 재매핑해 경계에서 값이 튀지 않게
      const scale = clamp(
        (mag - GYRO_DEADZONE) / (GYRO_TILT_RANGE - GYRO_DEADZONE),
        0,
        1
      );
      const nx = (tx / mag) * scale;
      const ny = (ty / mag) * scale;

      // 포인터 모드와 동일한 관계로 매핑 (표면 x 100% ↔ rotateY -MAX)
      mvX.set(ny * MAX_ROTATE_X);
      mvY.set(-nx * MAX_ROTATE_Y);
      applySurfacePointerRef.current(50 + nx * 50, 50 + ny * 50);
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      mvX.set(0);
      mvY.set(0);
      setIsActive(false);
      cardRef.current?.style.setProperty("--pointer-from-center", "0");
    };
  }, [gyro, mvX, mvY]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // 회전 중인 카드가 아닌, 변형 없는 래퍼 기준으로 좌표 계산
    const wrap = wrapRef.current;
    if (!wrap) return;
    setIsActive(true);
    const rect = wrap.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 기울기 계산 (중심 기준 -1 ~ 1 비율 × 최대 각도)
    const rX = ((y - centerY) / centerY) * MAX_ROTATE_X;
    const rY = ((centerX - x) / centerX) * MAX_ROTATE_Y;

    mvX.set(rX);
    mvY.set(rY);

    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    updateShine();
  };

  const handleLeave = () => {
    mvX.set(0);
    mvY.set(0);
    lastPointerRef.current = null;
    cardRef.current?.style.setProperty("--pointer-from-center", "0");
    setIsActive(false);
  };

  const rarityClass = `tilt-card--${rarity}`;

  return (
    <div
      ref={wrapRef}
      className="tilt-card-wrap"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
      onPointerLeave={handleLeave}
      onPointerUp={handleLeave}
      onPointerCancel={handleLeave}
      style={{ aspectRatio: CARD_ASPECT_RATIO }}
    >
      <motion.div
        ref={cardRef}
        className={`tilt-card ${rarityClass} ${isActive ? "is-active" : ""}`}
        style={{
          rotateX,
          rotateY,
          transformPerspective: PERSPECTIVE,
          // CSS의 url("/images/...") 절대경로는 vite base를 못 타서 404가 나므로 여기서 주입
          ["--grain" as string]: `url("${import.meta.env.BASE_URL}images/card/epic/grain.webp")`,
        }}
      >
        <div className="tilt-img" style={{ backgroundImage: `url(${imageUrl})` }} />
        <div className="tilt-glare" />
        {rarity === "rare" && <div className="tilt-shine-rare" />}
        {rarity === "unique" && <div className="tilt-shine-unique" />}
        {rarity === "legendary" && <div className="tilt-shine-legendary" />}
        {rarity === "epic" && <div className="tilt-shine-epic" />}
      </motion.div>
    </div>
  );
}
