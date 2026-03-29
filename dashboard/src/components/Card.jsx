import clsx from "clsx";

export function Card({ children, className, glow }) {
  return (
    <div
      className={clsx(
        "border bg-card border-border text-card-foreground p-4 rounded-none",
        glow && "glow-edge",
        className
      )}
    >
      {children}
    </div>
  );
}
