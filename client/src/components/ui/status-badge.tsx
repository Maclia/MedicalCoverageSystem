import { cn } from "@/lib/utils";

type StatusType = "active" | "inactive" | "pending" | "expired";
type DependentType = "principal" | "spouse" | "child";

interface StatusBadgeProps {
  status: StatusType | DependentType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Define colors based on status
  const getStatusColor = (status: StatusType | DependentType) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-600";
      case "inactive":
        return "bg-gray-100 text-gray-600";
      case "pending":
        return "bg-yellow-100 text-yellow-600";
      case "expired":
        return "bg-red-100 text-red-600";
      case "principal":
        return "bg-blue-100 text-blue-600";
      case "spouse":
        return "bg-purple-100 text-purple-600";
      case "child":
        return "bg-orange-100 text-orange-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-medium",
        getStatusColor(status),
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
