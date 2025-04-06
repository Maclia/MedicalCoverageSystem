import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarWithInitialsProps {
  name: string;
  image?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  bgColor?: string;
}

export function AvatarWithInitials({
  name,
  image,
  size = "md",
  className,
  bgColor = "bg-primary",
}: AvatarWithInitialsProps) {
  // Generate initials from name
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Determine size class
  const sizeClass = 
    size === "sm" 
      ? "h-8 w-8 text-xs" 
      : size === "lg" 
        ? "h-12 w-12 text-lg" 
        : "h-10 w-10 text-sm";

  return (
    <Avatar className={`${sizeClass} ${className}`}>
      {image && <AvatarImage src={image} alt={name} />}
      <AvatarFallback className={`${bgColor} text-white`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
