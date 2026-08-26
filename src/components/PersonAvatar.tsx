import type { CSSProperties } from "react";
import { useState } from "react";

type PersonAvatarProps = {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  status?: "online" | "busy";
  className?: string;
};

const sizeMap = { xs: 22, sm: 28, md: 36, lg: 48 };
function nameSeed(name: string) {
  return Array.from(name).reduce((total, character) => total + (character.codePointAt(0) ?? 0), 0);
}

const backgrounds = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"];
const anonymousSeeds = ["Aster", "Birch", "Cedar", "Dune", "Elm", "Flint", "Grove"];

// Uses the same DiceBear Micah portrait source as 21st.dev Member Selector #9908.
export function PersonAvatar({ className = "", name, size = "md", status }: PersonAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const seed = nameSeed(name);
  const style = {
    "--person-avatar-size": `${sizeMap[size]}px`,
  } as CSSProperties;
  const imageUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${anonymousSeeds[seed % anonymousSeeds.length]}&backgroundColor=${backgrounds[seed % backgrounds.length]}`;

  return (
    <span
      aria-label={name}
      className={`person-avatar ${className}`}
      data-name={name}
      role="img"
      style={style}
      title={name}
    >
      {imageFailed ? <span className="person-avatar-fallback">{name.slice(0, 1)}</span> : <img alt="" onError={() => setImageFailed(true)} src={imageUrl} />}
      {status && <i aria-label={status === "online" ? "在线" : "忙碌"} className={`person-avatar-status ${status}`} />}
    </span>
  );
}

export function PersonAvatarGroup({ names, size = "sm" }: { names: string[]; size?: PersonAvatarProps["size"] }) {
  return (
    <span aria-label={`参与者：${names.join("、")}`} className="person-avatar-group">
      {names.map((name) => <PersonAvatar key={name} name={name} size={size} />)}
    </span>
  );
}
