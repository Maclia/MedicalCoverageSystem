import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form, FormControl, FormDescription, 
  FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { CalendarIcon, Plus, Trash2, FileText } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProcedureItem {
  id?: number;
  procedureId: number;
  procedureName?: string;
  procedureCode?: string;
  quantity: number;
  unitRate?: number;
  totalAmount?: number;
  notes?: string;
}

export default function ProviderClaimSubmission() {
  const { toast } = useToast();
  
  // State for the form
  const [institutionId, setInstitutionId] = useState<number>(0);
  const [personnelId, setPersonnelId] = useState<number>(0);
  const [memberId, setMemberId] = useState<number>(0);
  const [benefitId, setBenefitId] = useState<number>(0);
  const [serviceDate, setServiceDate] = useState<Date | undefined>(new Date());
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisCodeType, setDiagnosisCodeType] = useState<'ICD-10' | 'ICD-11'>('ICD-10');
  const [description, setDescription] = useState('');
  const [treatmentDetails, setTreatmentDetails] = useState('');
  const [selectedProcedures, setSelectedProcedures] = useState<ProcedureItem[]>([]);
  
  // Dialog states
  const [addProcedureDialogOpen, setAddProcedureDialogOpen] = useState(false);
  const [selectedProcedureId, setSelectedProcedureId] = useState<number>(0);
  const [procedureQuantity, setProcedureQuantity] = useState(1);
  const [procedureNotes, setProcedureNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);
  
  // Fetch data
  const { data: institutions } = useQuery({
    queryKey: ['/api/medical-institutions'],
    enabled: true,
  });
  
  const { data: benefits } = useQuery({
    queryKey: ['/api/benefits'],
    enabled: true,
  });
  
  const { data: members } = useQuery({
    queryKey: ['/api/members'],
    enabled: true,
  });
  
  const { data: personnel, refetch: refetchPersonnel } = useQuery({
    queryKey: ['/api/medical-personnel', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const response = await fetch(`/api/medical-personnel?institutionId=${institutionId}`);
      if (!response.ok) throw new Error('Failed to fetch personnel');
      return response.json();
    },
    enabled: !!institutionId,
  });
  
  const { data: procedures } = useQuery({
    queryKey: ['/api/medical-procedures'],
    enabled: true,
  });
  
  const { data: providerRates, refetch: refetchRates } = useQuery({
    queryKey: ['/api/provider-procedure-rates', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const response = await fetch(`/api/provider-procedure-rates?institutionId=${institutionId}`);
      if (!response.ok) throw new Error('Failed to fetch provider rates');
      return response.json();
    },
    enabled: !!institutionId,
  });
  
  // Effect to refresh personnel when institution changes
  useEffect(() => {
    if (institutionId) {
      refetchPersonnel();
      refetchRates();
    }
  }, [institutionId, refetchPersonnel, refetchRates]);
  
  // Handler for adding a procedure
  const handleAddProcedure = () => {
    if (!selectedProcedureId || procedureQuantity < 1) {
      toast({
        title: "Invalid Procedure",
        description: "Please select a procedure and specify a valid quantity.",
        variant: "destructive"
      });
      return;
    }
    
    // Find the procedure details
    const procedure = procedures?.find((p: any) => p.id === selectedProcedureId);
    if (!procedure) {
      toast({
        title: "Procedure Not Found",
        description: "The selected procedure could not be found.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if there's a provider-specific rate
    const rate = providerRates?.find((r: any) => 
      r.procedureId === selectedProcedureId && r.active
    );
    
    // Use provider rate if available, otherwise use standard rate
    const unitRate = rate ? rate.agreedRate : procedure.standardRate;
    const totalAmount = unitRate * procedureQuantity;
    
    // Add the procedure to the list
    const newProcedure: ProcedureItem = {
      procedureId: selectedProcedureId,
      procedureName: procedure.name,
      procedureCode: procedure.code,
      quantity: procedureQuantity,
      unitRate,
      totalAmount,
      notes: procedureNotes
    };
    
    setSelectedProcedures([...selectedProcedures, newProcedure]);
    
    // Reset form fields
    setSelectedProcedureId(0);
    setProcedureQuantity(1);
    setProcedureNotes('');
    setAddProcedureDialogOpen(false);
    
    toast({
      title: "Procedure Added",
      description: `${procedure.name} added to claim.`
    });
  };
  
  // Handler for removing a procedure
  const handleRemoveProcedure = (index: number) => {
    const updatedProcedures = [...selectedProcedures];
    updatedProcedures.splice(index, 1);
    setSelectedProcedures(updatedProcedures);
    
    toast({
      title: "Procedure Removed",
      description: "The procedure has been removed from the claim."
    });
  };
  
  // Calculate total claim amount
  const totalClaimAmount = selectedProcedures.reduce(
    (sum, item) => sum + (item.totalAmount || 0), 
    0
  );
  
  // Handler for submitting the claim
  const handleSubmitClaim = async () => {
    try {
      setSubmitting(true);
      
      // Validate form
      if (!institutionId || !personnelId || !memberId || !benefitId || !serviceDate || 
          !diagnosis || !diagnosisCode || !description || selectedProcedures.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please complete all required fields and add at least one procedure.",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }
      
      // Prepare claim data
      const claimData = {
        claim: {
          institutionId,
          personnelId,
          memberId,
          benefitId,
          serviceDate: format(serviceDate, 'yyyy-MM-dd'),
          diagnosis,
          diagnosisCode,
          diagnosisCodeType,
          description,
          treatmentDetails,
          amount: totalClaimAmount, // This will be recalculated on the server
          status: 'submitted'
        },
        procedureItems: selectedProcedures.map(item => ({
          procedureId: item.procedureId,
          quantity: item.quantity,
          notes: item.notes
        }))
      };
      
      // Submit the claim
      const response = await fetch('/api/claims-with-procedures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(claimData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit claim');
      }
      
      const result = await response.json();
      setClaimResult(result);
      setSuccessDialogOpen(true);
      
      // Reset form
      resetForm();
      
    } catch (error: any) {
      toast({
        title: "Submission Error",
        description: error.message || "An error occurred while submitting the claim.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Reset form fields
  const resetForm = () => {
    setInstitutionId(0);
    setPersonnelId(0);
    setMemberId(0);
    setBenefitId(0);
    setServiceDate(new Date());
    setDiagnosis('');
    setDiagnosisCode('');
    setDiagnosisCodeType('ICD-10');
    setDescription('');
    setTreatmentDetails('');
    setSelectedProcedures([]);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Provider Claim Submission</h1>
          <p className="text-muted-foreground">Submit claims for verified members with medical procedures and rates</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Claim Information</CardTitle>
          <CardDescription>
            Enter details about the medical service provided
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Facility & Provider Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="institution">Medical Facility</Label>
                <Select 
                  value={institutionId.toString()} 
                  onValueChange={(value) => setInstitutionId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a medical facility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Select a facility</SelectItem>
                    {institutions?.map((institution: any) => (
                      <SelectItem key={institution.id} value={institution.id.toString()}>
                        {institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="personnel">Medical Personnel</Label>
                <Select 
                  value={personnelId.toString()} 
                  onValueChange={(value) => setPersonnelId(Number(value))}
                  disabled={!institutionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medical personnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Select personnel</SelectItem>
                    {personnel?.map((person: any) => (
                      <SelectItem key={person.id} value={person.id.toString()}>
                        {person.firstName} {person.lastName} ({person.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="member">Member</Label>
                <Select 
                  value={memberId.toString()} 
                  onValueChange={(value) => setMemberId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Select a member</SelectItem>
                    {members?.map((member: any) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.firstName} {member.lastName} 
                        ({member.memberType === 'principal' ? 'Principal' : 'Dependent'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="benefit">Benefit</Label>
                <Select 
                  value={benefitId.toString()} 
                  onValueChange={(value) => setBenefitId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a benefit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Select a benefit</SelectItem>
                    {benefits?.map((benefit: any) => (
                      <SelectItem key={benefit.id} value={benefit.id.toString()}>
                        {benefit.name} ({benefit.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Service Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="serviceDate">Service Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !serviceDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {serviceDate ? format(serviceDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={serviceDate}
                    onSelect={setServiceDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="diagnosisCodeType">Diagnosis Code Type</Label>
                <Select 
                  value={diagnosisCodeType} 
                  onValueChange={(value: 'ICD-10' | 'ICD-11') => setDiagnosisCodeType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select code type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ICD-10">ICD-10</SelectItem>
                    <SelectItem value="ICD-11">ICD-11</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="diagnosisCode">Diagnosis Code</Label>
                <Input 
                  id="diagnosisCode" 
                  placeholder="Enter diagnosis code"
                  value={diagnosisCode}
                  onChange={(e) => setDiagnosisCode(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input 
              id="diagnosis" 
              placeholder="Enter diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Enter claim description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="treatmentDetails">Treatment Details</Label>
            <Textarea 
              id="treatmentDetails" 
              placeholder="Enter treatment details (optional)"
              value={treatmentDetails}
              onChange={(e) => setTreatmentDetails(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Medical Procedures</CardTitle>
            <CardDescription>
              Add procedures and treatments for this claim
            </CardDescription>
          </div>
          <Dialog open={addProcedureDialogOpen} onOpenChange={setAddProcedureDialogOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Procedure
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Medical Procedure</DialogTitle>
                <DialogDescription>
                  Select a procedure and specify quantity. The system will automatically apply the correct rate.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="procedure">Procedure</Label>
                  <Select 
                    value={selectedProcedureId.toString()} 
                    onValueChange={(value) => setSelectedProcedureId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a procedure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Select a procedure</SelectItem>
                      {procedures?.map((procedure: any) => {
                        // Check if there's a provider rate
                        const rate = providerRates?.find((r: any) => 
                          r.procedureId === procedure.id && r.active
                        );
                        
                        const rateInfo = rate 
                          ? `$${rate.agreedRate.toFixed(2)} (Negotiated)` 
                          : `$${procedure.standardRate.toFixed(2)} (Standard)`;
                          
                        return (
                          <SelectItem key={procedure.id} value={procedure.id.toString()}>
                            {procedure.name} - {procedure.code} - {rateInfo}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    min="1"
                    value={procedureQuantity}
                    onChange={(e) => setProcedureQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Additional notes about this procedure"
                    value={procedureNotes}
                    onChange={(e) => setProcedureNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddProcedureDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProcedure}>
                  Add Procedure
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {selectedProcedures.length > 0 ? (
            <Table>
              <TableCaption>List of procedures for this claim</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Unit Rate</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProcedures.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.procedureName}</TableCell>
                    <TableCell>{item.procedureCode}</TableCell>
                    <TableCell className="text-right">${item.unitRate?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.totalAmount?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveProcedure(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell colSpan={4} className="text-right">Total Claim Amount:</TableCell>
                  <TableCell className="text-right">${totalClaimAmount.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No procedures added yet. Click the "Add Procedure" button to get started.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetForm}>Reset Form</Button>
          <Button 
            onClick={handleSubmitClaim} 
            disabled={selectedProcedures.length === 0 || submitting}
          >
            {submitting ? "Submitting..." : "Submit Claim"}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Claim Submitted Successfully</AlertDialogTitle>
            <AlertDialogDescription>
              Your claim has been submitted and is pending review.
              <div className="mt-4 p-4 bg-muted rounded-md">
                <p><strong>Claim ID:</strong> {claimResult?.claim?.id}</p>
                <p><strong>Amount:</strong> ${claimResult?.claim?.amount?.toFixed(2)}</p>
                <p><strong>Status:</strong> {claimResult?.claim?.status}</p>
                <p><strong>Procedures:</strong> {claimResult?.procedureItems?.length}</p>
                {claimResult?.claim?.providerVerified === false && (
                  <p className="text-amber-600 mt-2">
                    Note: This claim requires higher approval because the provider's verification is pending.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}