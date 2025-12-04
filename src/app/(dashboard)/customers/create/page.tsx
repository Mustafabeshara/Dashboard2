/**
 * Create Customer Page
 * Form for adding new customers with comprehensive validation and user feedback
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormField,
  SelectField,
  CurrencyField,
} from '@/components/ui/form-field';
import { useFormValidation, customerValidation } from '@/hooks/useFormValidation';
import { ArrowLeft, Save, AlertCircle, Building2, User, MapPin, CreditCard } from 'lucide-react';

const CUSTOMER_TYPES = [
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'PRIVATE', label: 'Private' },
  { value: 'CLINIC', label: 'Clinic' },
];

export default function CreateCustomerPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useFormValidation(customerValidation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validate entire form
    const isValid = form.validateForm();
    if (!isValid) {
      toast.error('Please fix the errors', { description: 'Some required fields are missing or invalid' });
      // Scroll to first error
      const firstError = document.querySelector('[aria-invalid="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating customer...');

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.values.name,
          type: form.values.type,
          registrationNumber: form.values.registrationNumber || undefined,
          taxId: form.values.taxId || undefined,
          address: form.values.address || undefined,
          city: form.values.city || undefined,
          country: form.values.country || undefined,
          primaryContact: form.values.primaryContact || undefined,
          email: form.values.email || undefined,
          phone: form.values.phone || undefined,
          paymentTerms: form.values.paymentTerms || undefined,
          creditLimit: form.values.creditLimit ? Number(form.values.creditLimit) : undefined,
        }),
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success('Customer created successfully', { description: `${form.values.name} has been added to the system` });
        router.push(`/customers/${result.data.id}`);
      } else {
        // Handle specific validation errors from server
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((err: { field: string; message: string }) => {
            form.setError(err.field as keyof typeof customerValidation, err.message);
          });
          toast.error('Validation failed', { description: 'Please check the highlighted fields' });
        } else {
          setServerError(result.error || 'Failed to create customer');
          toast.error('Failed to create customer', { description: result.error || 'An unexpected error occurred' });
        }
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error creating customer:', error);
      setServerError('Network error. Please check your connection and try again.');
      toast.error('Network error', { description: 'Please check your connection and try again' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Add New Customer
          </h1>
          <p className="text-muted-foreground">
            Enter customer details to add them to your system
          </p>
        </div>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        </div>
      )}

      {/* Required Fields Notice */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          Fields marked with <span className="text-red-500 font-bold">*</span> are required.
          Please fill in all mandatory information before submitting.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Core details about the customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FormField
                    id="name"
                    label="Customer Name"
                    value={form.values.name}
                    onChange={(v) => form.setValue('name', v)}
                    onBlur={form.handleBlur('name')}
                    placeholder="e.g., Ministry of Health"
                    required
                    error={form.touched.name ? form.errors.name : undefined}
                    showSuccessIcon
                    isValid={form.touched.name && !form.errors.name && Boolean(form.values.name)}
                    hint="Enter the official registered name of the customer"
                  />
                </div>

                <SelectField
                  id="type"
                  label="Customer Type"
                  value={form.values.type as string}
                  onChange={(v) => form.setValue('type', v)}
                  onBlur={form.handleBlur('type')}
                  options={CUSTOMER_TYPES}
                  required
                  error={form.touched.type ? form.errors.type : undefined}
                  hint="Select the type of organization"
                />

                <FormField
                  id="registrationNumber"
                  label="Registration Number"
                  value={form.values.registrationNumber}
                  onChange={(v) => form.setValue('registrationNumber', v)}
                  onBlur={form.handleBlur('registrationNumber')}
                  placeholder="Company registration number"
                  error={form.touched.registrationNumber ? form.errors.registrationNumber : undefined}
                />

                <FormField
                  id="taxId"
                  label="Tax ID"
                  value={form.values.taxId}
                  onChange={(v) => form.setValue('taxId', v)}
                  onBlur={form.handleBlur('taxId')}
                  placeholder="Tax identification number"
                  error={form.touched.taxId ? form.errors.taxId : undefined}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>Contact details and communication channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                id="primaryContact"
                label="Primary Contact Person"
                value={form.values.primaryContact}
                onChange={(v) => form.setValue('primaryContact', v)}
                onBlur={form.handleBlur('primaryContact')}
                placeholder="Contact person name"
                error={form.touched.primaryContact ? form.errors.primaryContact : undefined}
                hint="The main person to contact at this organization"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="email"
                  label="Email"
                  type="email"
                  value={form.values.email}
                  onChange={(v) => form.setValue('email', v)}
                  onBlur={form.handleBlur('email')}
                  placeholder="email@example.com"
                  error={form.touched.email ? form.errors.email : undefined}
                  showSuccessIcon
                  isValid={form.touched.email && !form.errors.email && Boolean(form.values.email)}
                />

                <FormField
                  id="phone"
                  label="Phone"
                  type="tel"
                  value={form.values.phone}
                  onChange={(v) => form.setValue('phone', v)}
                  onBlur={form.handleBlur('phone')}
                  placeholder="+965 XXXX XXXX"
                  error={form.touched.phone ? form.errors.phone : undefined}
                  hint="Include country code for international numbers"
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
              <CardDescription>Physical location details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                id="address"
                label="Street Address"
                type="textarea"
                value={form.values.address}
                onChange={(v) => form.setValue('address', v)}
                onBlur={form.handleBlur('address')}
                placeholder="Enter full street address"
                rows={2}
                error={form.touched.address ? form.errors.address : undefined}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="city"
                  label="City"
                  value={form.values.city}
                  onChange={(v) => form.setValue('city', v)}
                  onBlur={form.handleBlur('city')}
                  placeholder="e.g., Kuwait City"
                  error={form.touched.city ? form.errors.city : undefined}
                />

                <FormField
                  id="country"
                  label="Country"
                  value={form.values.country}
                  onChange={(v) => form.setValue('country', v)}
                  onBlur={form.handleBlur('country')}
                  placeholder="Kuwait"
                  error={form.touched.country ? form.errors.country : undefined}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Financial Information
              </CardTitle>
              <CardDescription>Payment and credit details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="paymentTerms"
                  label="Payment Terms"
                  value={form.values.paymentTerms}
                  onChange={(v) => form.setValue('paymentTerms', v)}
                  onBlur={form.handleBlur('paymentTerms')}
                  placeholder="e.g., Net 30, Net 60"
                  error={form.touched.paymentTerms ? form.errors.paymentTerms : undefined}
                  hint="Standard payment terms for this customer"
                />

                <CurrencyField
                  id="creditLimit"
                  label="Credit Limit"
                  value={form.values.creditLimit}
                  onChange={(v) => form.setValue('creditLimit', v)}
                  onBlur={form.handleBlur('creditLimit')}
                  placeholder="0.00"
                  error={form.touched.creditLimit ? form.errors.creditLimit : undefined}
                  hint="Maximum credit extended to this customer"
                  currency="KWD"
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Summary & Actions */}
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-gray-600">
                  {form.isValid ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      All required fields are filled
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      Please fill all required fields
                    </span>
                  )}
                </div>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/customers">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Creating...' : 'Create Customer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
