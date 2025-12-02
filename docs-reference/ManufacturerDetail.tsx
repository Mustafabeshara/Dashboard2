import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Globe, Mail, Phone, MapPin } from "lucide-react";
import { DocumentFolders } from "@/components/DocumentFolders";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function ManufacturerDetail() {
  const [, params] = useRoute("/manufacturers/:id");
  const manufacturerId = params?.id ? parseInt(params.id) : 0;

  const { data: manufacturer, isLoading } = trpc.crud.manufacturers.getById.useQuery(
    { id: manufacturerId },
    { enabled: !!manufacturerId }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Manufacturer not found</h2>
          <Link href="/manufacturers">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Manufacturers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb 
        items={[
          { label: "Manufacturers", path: "/manufacturers" },
          { label: manufacturer.name }
        ]} 
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            {manufacturer.name}
          </h1>
          {manufacturer.country && (
            <p className="text-muted-foreground mt-1">
              <MapPin className="inline h-4 w-4 mr-1" />
              {manufacturer.country}
            </p>
          )}
        </div>
      </div>

      {/* Manufacturer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Manufacturer Information</CardTitle>
          <CardDescription>Contact details and company information</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manufacturer.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{manufacturer.email}</p>
              </div>
            </div>
          )}
          
          {manufacturer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{manufacturer.phone}</p>
              </div>
            </div>
          )}
          
          {manufacturer.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Website</p>
                <a 
                  href={manufacturer.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {manufacturer.website}
                </a>
              </div>
            </div>
          )}
          
          {manufacturer.notes && (
            <div className="col-span-full">
              <p className="text-sm font-medium mb-1">Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{manufacturer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents & Folders */}
      <Card>
        <CardHeader>
          <CardTitle>Documents & Folders</CardTitle>
          <CardDescription>
            Organize manufacturer documents in folders with required document checklists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentFolders 
            entityType="manufacturer" 
            entityId={manufacturer.id} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
