import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AvatarWithInitialsProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  bgColor?: string;
  textColor?: string;
  className?: string;
}

export function AvatarWithInitials({
  name,
  size = "md",
  bgColor = "bg-primary",
  textColor = "text-primary-foreground",
  className,
}: AvatarWithInitialsProps) {
  // Extract initials from name
  const getInitials = (name: string) => {
    if (!name) return "";
    
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "";
    
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    
    // Get first letter of first and last name
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Map size to tailwind classes
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-2xl"
  };
  
  const initials = getInitials(name);
  
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback 
        className={cn(
          "font-semibold", 
          bgColor, 
          textColor
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}