import Image from "next/image";

export default function StickerIcon({ name, size = 24 }) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="sticker-icon"
    />
  );
}
