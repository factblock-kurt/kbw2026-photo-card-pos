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
};

// 카드 크기와 무관한 최대 기울기 각도
const MAX_ROTATE_X = 20;
const MAX_ROTATE_Y = 15;
const PERSPECTIVE = 800;

export default function Card({ imageUrl, rarity }: Props) {
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

    const px = Math.min(100, Math.max(0, ((u + rect.width / 2) / rect.width) * 100));
    const py = Math.min(100, Math.max(0, ((v + rect.height / 2) / rect.height) * 100));

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
