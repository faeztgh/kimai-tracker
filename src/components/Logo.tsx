import logoUrl from "../assets/kimai-logo.png";

export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Kimai"
      draggable={false}
      className={`${className} rounded-md object-contain`}
    />
  );
}
