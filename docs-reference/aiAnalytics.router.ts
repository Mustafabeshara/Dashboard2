    .input(z.object({
      productId: z.number(),
    }))
    .query(async ({ input }) => {
      const { productId } = input;
