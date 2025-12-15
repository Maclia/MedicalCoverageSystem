import { useParams } from "wouter";
import { WellnessIntegration } from "@/components/wellness/WellnessIntegration";

export default function WellnessPage() {
  const { id } = useParams();

  return (
    <div className="container mx-auto p-6">
      <WellnessIntegration memberId={id || ""} memberName={`Member ${id}`} />
    </div>
  );
}