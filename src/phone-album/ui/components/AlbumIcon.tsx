/** 本地内联图标，避免相册依赖外部字体或 CDN。 */
export function AlbumIcon({
  name,
  size = 18,
}: {
  name: "albums" | "camera" | "image" | "trash";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "camera") {
    return (
      <svg {...common}>
        <path d="M4 7.5h3l1.4-2h7.2l1.4 2h3v11H4z" />
        <circle cx="12" cy="13" r="3.6" />
      </svg>
    );
  }
  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
      </svg>
    );
  }
  if (name === "image") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m5 18 5-5 3.5 3 2.5-2 3 4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="4" width="13" height="13" rx="2" />
      <path d="M8 20h10a2 2 0 0 0 2-2V8M7 14l3-3 2.5 2.5L14 12l3 3" />
    </svg>
  );
}
