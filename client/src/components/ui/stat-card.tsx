import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconTextColor: string;
  changeValue?: string;
  changeDirection?: "up" | "down";
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconTextColor,
  changeValue,
  changeDirection = "up",
  className,
}: StatCardProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow-sm p-5", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="text-2xl font-semibold mt-1 text-neutral-700">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBgColor} ${iconTextColor}`}>
          <i className="material-icons">{icon}</i>
        </div>
      </div>
      {changeValue && (
        <div className={`mt-4 flex items-center text-sm ${changeDirection === "up" ? "text-green-600" : "text-red-600"}`}>
          <i className="material-icons text-sm mr-1">
            {changeDirection === "up" ? "arrow_upward" : "arrow_downward"}
          </i>
          <span>{changeValue}</span>
        </div>
      )}
    </div>
  );
}
