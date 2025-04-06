import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import BenefitList from "@/components/benefits/BenefitList";
import BenefitForm from "@/components/benefits/BenefitForm";
import CompanyBenefitList from "@/components/benefits/CompanyBenefitList";
import CompanyBenefitForm from "@/components/benefits/CompanyBenefitForm";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Benefits() {
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const [showCompanyBenefitForm, setShowCompanyBenefitForm] = useState(false);
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Benefits Management</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Benefits Overview</CardTitle>
            <CardDescription>
              Manage insurance benefits and company-specific benefit selections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="benefits" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="benefits">Standard Benefits</TabsTrigger>
                <TabsTrigger value="company-benefits">Company Benefits</TabsTrigger>
                <TabsTrigger value="documentation">Documentation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="benefits">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Insurance Benefits</h2>
                  <Button onClick={() => setShowBenefitForm(!showBenefitForm)}>
                    {showBenefitForm ? "Cancel" : "Add New Benefit"}
                  </Button>
                </div>
                
                {showBenefitForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                    <BenefitForm 
                      onSuccess={() => setShowBenefitForm(false)}
                    />
                  </div>
                )}
                
                <BenefitList />
              </TabsContent>
              
              <TabsContent value="company-benefits">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Company Benefit Selections</h2>
                  <Button onClick={() => setShowCompanyBenefitForm(!showCompanyBenefitForm)}>
                    {showCompanyBenefitForm ? "Cancel" : "Add Company Benefit"}
                  </Button>
                </div>
                
                {showCompanyBenefitForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                    <CompanyBenefitForm 
                      onSuccess={() => setShowCompanyBenefitForm(false)}
                    />
                  </div>
                )}
                
                <CompanyBenefitList />
              </TabsContent>
              
              <TabsContent value="documentation">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Benefits Documentation</h2>
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>What are Standard Benefits?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground mb-2">
                          Standard benefits are the core insurance offerings that are available to all companies. These benefits
                          form the foundation of insurance coverage and can be selected by companies for their members.
                        </p>
                        <p className="text-muted-foreground">
                          Examples include primary care visits, hospitalization, prescription drugs, and preventive care.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How do Company Benefits work?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground mb-2">
                          Company benefits are specific selections made by companies from the available standard benefits.
                          When a company purchases a premium plan, they can select which benefits they want to include for their members.
                        </p>
                        <p className="text-muted-foreground">
                          Each company benefit is associated with a specific company, a benefit, and a premium. This allows for
                          tracking which benefits are active for which companies during specific premium periods.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-3">
                      <AccordionTrigger>What are Waiting Periods?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground mb-2">
                          Some benefits may have waiting periods before they become active. This is a period of time that must pass
                          after a member is enrolled before they can use a particular benefit.
                        </p>
                        <p className="text-muted-foreground">
                          For example, maternity benefits typically have a waiting period of 9-12 months to prevent people from enrolling
                          only after they know they need the coverage.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-4">
                      <AccordionTrigger>What are Benefit Categories?</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">
                          Benefits are organized into categories to help with organization and searching. The main categories include:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                          <li>Medical: Primary care and general medical services</li>
                          <li>Dental: Services related to oral health</li>
                          <li>Vision: Eye care services and vision correction</li>
                          <li>Wellness: Preventive care and health maintenance</li>
                          <li>Hospital: Inpatient and hospital-related services</li>
                          <li>Prescription: Medication coverage</li>
                          <li>Emergency: Emergency medical services</li>
                          <li>Maternity: Pregnancy and childbirth related services</li>
                          <li>Specialist: Specialized medical care</li>
                          <li>Other: Additional services not fitting the main categories</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}