import { useRef, useState } from "react";

import { motion, useMotionValue, useSpring } from "framer-motion";
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

export default function Card({ imageUrl, rarity }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  // 원본 값
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);

  // 스프링 적용 (부드럽게)
  const rotateX = useSpring(mvX, { stiffness: 180, damping: 18 });
  const rotateY = useSpring(mvY, { stiffness: 180, damping: 18 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    setIsActive(true);
    const rect = card.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 기울기 계산
    const rX = (y - centerY) / 10;
    const rY = (centerX - x) / 10;

    mvX.set(rX);
    mvY.set(rY);

    const pointerX = (x / rect.width) * 100;
    const pointerY = (y / rect.height) * 100;

    const pointerFromLeft = pointerX / 100;
    const pointerFromTop = pointerY / 100;
    const pointerFromCenter =
      Math.sqrt(
        Math.pow(pointerFromLeft - 0.5, 2) +
        Math.pow(pointerFromTop - 0.5, 2)
      ) * 2;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      card.style.setProperty("--pointer-x", `${pointerX}%`);
      card.style.setProperty("--pointer-y", `${pointerY}%`);
      card.style.setProperty("--pointer-from-left", `${pointerFromLeft}`);
      card.style.setProperty("--pointer-from-top", `${pointerFromTop}`);
      card.style.setProperty("--pointer-from-center", `${pointerFromCenter}`);
      card.style.setProperty("--background-x", `${pointerX}%`);
      card.style.setProperty("--background-y", `${pointerY}%`);
      rafIdRef.current = null;
    });
  };

  const handleLeave = () => {
    mvX.set(0);
    mvY.set(0);

    const card = cardRef.current;
    if (card) {
      card.style.setProperty("--pointer-from-center", `0`);
    }

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setIsActive(false);
  };

  const rarityClass = `tilt-card--${rarity}`;

  return (
    <motion.div
      ref={cardRef}
      className={`tilt-card ${rarityClass} ${isActive ? "is-active" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
      onPointerLeave={handleLeave}
      onPointerUp={handleLeave}
      onPointerCancel={handleLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
      }}
    >
      <div className="tilt-img" style={{ backgroundImage: `url(${imageUrl})` }} />
      <div className="tilt-glare" />
      {rarity === "rare" && <div className="tilt-shine-rare" />}
      {rarity === "unique" && <div className="tilt-shine-unique" />}
      {rarity === "legendary" && <div className="tilt-shine-legendary" />}
      {rarity === "epic" && <div className="tilt-shine-epic" />}
    </motion.div>
  );
}
