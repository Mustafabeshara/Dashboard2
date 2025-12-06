/**
 * Create Supplier Page
 * Form for adding new suppliers with comprehensive validation and user feedback
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
} from '@/components/ui/form-field';
import { useFormValidation, supplierValidation } from '@/hooks/useFormValidation';
import { ArrowLeft, Save, AlertCircle, Building2, User, MapPin, Briefcase, Star, FileText } from 'lucide-react';

const SUPPLIER_CATEGORIES = [
  { value: 'Medical Equipment', label: 'Medical Equipment' },
  { value: 'Pharmaceuticals', label: 'Pharmaceuticals' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Imaging', label: 'Imaging' },
  { value: 'Surgical Instruments', label: 'Surgical Instruments' },
  { value: 'Consumables', label: 'Consumables' },
  { value: 'IT Equipment', label: 'IT Equipment' },
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Other', label: 'Other' },
];

export default function CreateSupplierPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useFormValidation(supplierValidation);

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
    const loadingToast = toast.loading('Creating supplier...');

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.values.name,
          code: form.values.code || undefined,
          category: form.values.category || undefined,
          contactPerson: form.values.contactPerson || undefined,
          email: form.values.email || undefined,
          phone: form.values.phone || undefined,
          address: form.values.address || undefined,
          city: form.values.city || undefined,
          country: form.values.country || undefined,
          website: form.values.website || undefined,
          taxId: form.values.taxId || undefined,
          registrationNumber: form.values.registrationNumber || undefined,
          paymentTerms: form.values.paymentTerms || undefined,
          leadTime: form.values.leadTime ? Number(form.values.leadTime) : undefined,
          rating: form.values.rating ? Number(form.values.rating) : undefined,
          notes: form.values.notes || undefined,
        }),
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success('Supplier created successfully', { description: `${form.values.name} has been added to the system` });
        router.push(`/suppliers/${result.data.id}`);
      } else {
        // Handle specific validation errors from server
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((err: { field: string; message: string }) => {
            form.setError(err.field as keyof typeof supplierValidation, err.message);
          });
          toast.error('Validation failed', { description: 'Please check the highlighted fields' });
        } else {
          setServerError(result.error || 'Failed to create supplier');
          toast.error('Failed to create supplier', { description: result.error || 'An unexpected error occurred' });
        }
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error creating supplier:', error);
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
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Add New Supplier
          </h1>
          <p className="text-muted-foreground">
            Add a new supplier to your network
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
              <CardDescription>Essential details about the supplier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="name"
                  label="Supplier Name"
                  value={form.values.name}
                  onChange={(v) => form.setValue('name', v)}
                  onBlur={form.handleBlur('name')}
                  placeholder="e.g., Medical Supplies Co."
                  required
                  error={form.touched.name ? form.errors.name : undefined}
                  showSuccessIcon
                  isValid={form.touched.name && !form.errors.name && Boolean(form.values.name)}
                  hint="Enter the official registered name of the supplier"
                />

                <FormField
                  id="code"
                  label="Supplier Code"
                  value={form.values.code}
                  onChange={(v) => form.setValue('code', v)}
                  onBlur={form.handleBlur('code')}
                  placeholder="e.g., SUP-001"
                  error={form.touched.code ? form.errors.code : undefined}
                  hint="Unique identifier for this supplier"
                />

                <SelectField
                  id="category"
                  label="Category"
                  value={form.values.category as string}
                  onChange={(v) => form.setValue('category', v)}
                  onBlur={form.handleBlur('category')}
                  options={SUPPLIER_CATEGORIES}
                  placeholder="Select category"
                  error={form.touched.category ? form.errors.category : undefined}
                  hint="Primary business category"
                />

                <FormField
                  id="rating"
                  label="Rating"
                  type="number"
                  value={form.values.rating}
                  onChange={(v) => form.setValue('rating', v)}
                  onBlur={form.handleBlur('rating')}
                  placeholder="4.5"
                  min={0}
                  max={5}
                  step={0.1}
                  error={form.touched.rating ? form.errors.rating : undefined}
                  hint="Performance rating (0-5)"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="contactPerson"
                  label="Contact Person"
                  value={form.values.contactPerson}
                  onChange={(v) => form.setValue('contactPerson', v)}
                  onBlur={form.handleBlur('contactPerson')}
                  placeholder="John Doe"
                  error={form.touched.contactPerson ? form.errors.contactPerson : undefined}
                  hint="Primary point of contact"
                />

                <FormField
                  id="email"
                  label="Email"
                  type="email"
                  value={form.values.email}
                  onChange={(v) => form.setValue('email', v)}
                  onBlur={form.handleBlur('email')}
                  placeholder="contact@supplier.com"
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
                  hint="Include country code"
                />

                <FormField
                  id="website"
                  label="Website"
                  type="url"
                  value={form.values.website}
                  onChange={(v) => form.setValue('website', v)}
                  onBlur={form.handleBlur('website')}
                  placeholder="https://supplier.com"
                  error={form.touched.website ? form.errors.website : undefined}
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
                value={form.values.address}
                onChange={(v) => form.setValue('address', v)}
                onBlur={form.handleBlur('address')}
                placeholder="Street address"
                error={form.touched.address ? form.errors.address : undefined}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="city"
                  label="City"
                  value={form.values.city}
                  onChange={(v) => form.setValue('city', v)}
                  onBlur={form.handleBlur('city')}
                  placeholder="Kuwait City"
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

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Business Details
              </CardTitle>
              <CardDescription>Registration and payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="taxId"
                  label="Tax ID"
                  value={form.values.taxId}
                  onChange={(v) => form.setValue('taxId', v)}
                  onBlur={form.handleBlur('taxId')}
                  placeholder="Tax identification number"
                  error={form.touched.taxId ? form.errors.taxId : undefined}
                />

                <FormField
                  id="registrationNumber"
                  label="Registration Number"
                  value={form.values.registrationNumber}
                  onChange={(v) => form.setValue('registrationNumber', v)}
                  onBlur={form.handleBlur('registrationNumber')}
                  placeholder="Business registration number"
                  error={form.touched.registrationNumber ? form.errors.registrationNumber : undefined}
                />

                <FormField
                  id="paymentTerms"
                  label="Payment Terms"
                  value={form.values.paymentTerms}
                  onChange={(v) => form.setValue('paymentTerms', v)}
                  onBlur={form.handleBlur('paymentTerms')}
                  placeholder="Net 30"
                  error={form.touched.paymentTerms ? form.errors.paymentTerms : undefined}
                  hint="Standard payment terms"
                />

                <FormField
                  id="leadTime"
                  label="Lead Time (days)"
                  type="number"
                  value={form.values.leadTime}
                  onChange={(v) => form.setValue('leadTime', v)}
                  onBlur={form.handleBlur('leadTime')}
                  placeholder="7"
                  min={0}
                  error={form.touched.leadTime ? form.errors.leadTime : undefined}
                  hint="Typical delivery time in days"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Notes
              </CardTitle>
              <CardDescription>Any other relevant information</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                id="notes"
                label="Notes"
                type="textarea"
                value={form.values.notes}
                onChange={(v) => form.setValue('notes', v)}
                onBlur={form.handleBlur('notes')}
                placeholder="Additional information about this supplier..."
                rows={4}
                error={form.touched.notes ? form.errors.notes : undefined}
                hint="Include any special instructions or important details"
              />
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
                    <Link href="/suppliers">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Creating...' : 'Create Supplier'}
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
