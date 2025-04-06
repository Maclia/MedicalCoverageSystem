import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Region {
  id: number;
  name: string;
  country: string;
  description: string;
  createdAt: string;
}

export default function Regions() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [regionForm, setRegionForm] = useState({
    name: "",
    country: "",
    description: "",
  });

  const { data: regions, isLoading } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/regions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(regionForm),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create region');
      }
      
      // Clear form and close dialog
      setRegionForm({
        name: "",
        country: "",
        description: "",
      });
      setOpen(false);
      
      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/regions'] });
      
      toast({
        title: "Success",
        description: "Region was created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create region",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRegionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Regions</h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <i className="material-icons mr-2">add</i>
              Add Region
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Region</DialogTitle>
              <DialogDescription>
                Create a new geographic region for medical institutions and personnel.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Region Name</Label>
                <Input 
                  id="name"
                  name="name"
                  value={regionForm.name}
                  onChange={handleChange}
                  placeholder="e.g., Western Europe, North America"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input 
                  id="country"
                  name="country"
                  value={regionForm.country}
                  onChange={handleChange}
                  placeholder="e.g., United States, Germany"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description"
                  name="description"
                  value={regionForm.description}
                  onChange={handleChange}
                  placeholder="Brief description of the region"
                />
              </div>
              
              <div className="flex justify-end">
                <Button type="submit">Save Region</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regions</CardTitle>
          <CardDescription>
            Manage the geographical regions for medical institutions and personnel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : regions && regions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell className="font-medium">{region.id}</TableCell>
                      <TableCell>{region.name}</TableCell>
                      <TableCell>{region.country}</TableCell>
                      <TableCell>{region.description}</TableCell>
                      <TableCell>{new Date(region.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No regions found</h3>
              <p className="text-muted-foreground">
                Get started by creating a new region.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}