import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ui/form';
import { Input } from '@ui/input';
import { Button } from '@ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import { Checkbox } from '@ui/checkbox';
import { Calendar } from '@ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const dependentSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.date({
    required_error: 'Date of birth is required',
  }),
  relationship: z.string({
    required_error: 'Please select a relationship',
  }),
  gender: z.string({
    required_error: 'Please select gender',
  }),
  nationalId: z.string().min(6, 'National ID must be at least 6 characters'),
  phoneNumber: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  isStudent: z.boolean().default(false),
  hasDisability: z.boolean().default(false),
  notes: z.string().optional(),
});

type DependentFormValues = z.infer<typeof dependentSchema>;

interface DependentFormFixedProps {
  onSubmit: (values: DependentFormValues) => void;
  initialValues?: Partial<DependentFormValues>;
  isLoading?: boolean;
}

export const DependentFormFixed: React.FC<DependentFormFixedProps> = ({
  onSubmit,
  initialValues,
  isLoading = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialValues?.dateOfBirth
  );

  const form = useForm<DependentFormValues>({
    resolver: zodResolver(dependentSchema),
    defaultValues: {
      firstName: initialValues?.firstName || '',
      lastName: initialValues?.lastName || '',
      dateOfBirth: initialValues?.dateOfBirth,
      relationship: initialValues?.relationship || '',
      gender: initialValues?.gender || '',
      nationalId: initialValues?.nationalId || '',
      phoneNumber: initialValues?.phoneNumber || '',
      email: initialValues?.email || '',
      isStudent: initialValues?.isStudent || false,
      hasDisability: initialValues?.hasDisability || false,
      notes: initialValues?.notes || '',
    },
  });

  const handleSubmit = (values: DependentFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
            disabled={(date: Date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="nationalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>National ID</FormLabel>
                <FormControl>
                  <Input placeholder="Enter national ID number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter email address (optional)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Used for notifications and communications
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="isStudent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Is Student</FormLabel>
                  <FormDescription>
                    Check if this dependent is currently a student
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasDisability"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Has Disability</FormLabel>
                  <FormDescription>
                    Check if this dependent has a disability
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Dependent"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default DependentFormFixed;