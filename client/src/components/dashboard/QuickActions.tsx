import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanyForm from "@/components/companies/CompanyForm";
import MemberForm from "@/components/members/MemberForm";
import DependentForm from "@/components/dependents/DependentForm";
import PremiumCalculator from "@/components/premiums/PremiumCalculator";

export default function QuickActions() {
  const [dialogContent, setDialogContent] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
  }>({
    isOpen: false,
    title: "",
    content: null,
  });

  const closeDialog = () => {
    setDialogContent({ isOpen: false, title: "", content: null });
  };

  const actions = [
    {
      title: "Add New Company",
      description: "Register a new company profile",
      icon: "business",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      onClick: () => {
        setDialogContent({
          isOpen: true,
          title: "Add New Company",
          content: <CompanyForm onSuccess={closeDialog} />,
        });
      },
    },
    {
      title: "Add Principal Member",
      description: "Register a new employee",
      icon: "person_add",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      onClick: () => {
        setDialogContent({
          isOpen: true,
          title: "Add Principal Member",
          content: <MemberForm onSuccess={closeDialog} />,
        });
      },
    },
    {
      title: "Add Dependent",
      description: "Register spouse or child",
      icon: "group_add",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      onClick: () => {
        setDialogContent({
          isOpen: true,
          title: "Add Dependent",
          content: <DependentForm onSuccess={closeDialog} />,
        });
      },
    },
    {
      title: "Calculate Premium",
      description: "Generate premium quotes",
      icon: "calculate",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      onClick: () => {
        setDialogContent({
          isOpen: true,
          title: "Calculate Premium",
          content: <PremiumCalculator onSuccess={closeDialog} />,
        });
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="w-full flex items-center justify-between p-4 mb-3 last:mb-0 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition duration-150"
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full ${action.iconBg} flex items-center justify-center ${action.iconColor}`}>
                  <i className="material-icons">{action.icon}</i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{action.title}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </div>
              <i className="material-icons text-gray-500">chevron_right</i>
            </button>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogContent.isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
          </DialogHeader>
          {dialogContent.content}
        </DialogContent>
      </Dialog>
    </>
  );
}
