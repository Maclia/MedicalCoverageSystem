import { useParams } from "wouter";
import { RiskAssessmentDashboard } from "@/components/riskAssessment/RiskAssessmentDashboard";

export default function RiskAssessmentPage() {
  const { id } = useParams();

  return (
    <div className="container mx-auto p-6">
      <RiskAssessmentDashboard memberId={id || ""} memberName={`Member ${id}`} />
    </div>
  );
}