import { useParams } from "wouter";
import { CommunicationDashboard } from "@/components/communication/CommunicationDashboard";

export default function CommunicationPage() {
  const { id } = useParams();

  return (
    <div className="container mx-auto p-6">
      <CommunicationDashboard memberId={id || ""} memberName={`Member ${id}`} />
    </div>
  );
}