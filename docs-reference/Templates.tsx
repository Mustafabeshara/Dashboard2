  });

  const updateMutation = trpc.tenderTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      setShowEditDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  const filteredTemplates = templates?.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (template: any) => {