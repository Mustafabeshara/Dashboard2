export const forecastsRouter = router({
  list: protectedProcedure
    .input(z.object({
      forecastType: forecastTypeEnum.optional(),
      productId: z.number().optional(),
      customerId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getForecasts(input);
    }),

  create: protectedProcedure
    .input(z.object({
      forecastType: forecastTypeEnum,
      productId: z.number().optional(),
      customerId: z.number().optional(),
      department: z.string().optional(),
      milestone: z.string().optional(),
      periodStart: z.date(),
      periodEnd: z.date(),
      forecastedQuantity: z.number().min(0).optional(),
      forecastedRevenue: z.number().min(0).optional(),
      actualQuantity: z.number().min(0).optional(),
      actualRevenue: z.number().min(0).optional(),
      currency: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return db.createForecast({
        ...input,
        createdById: ctx.user.id,
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      actualQuantity: z.number().min(0).optional(),
      actualRevenue: z.number().min(0).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateForecast(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteForecast(input.id);
    }),
});

// ============ Deliveries ============
export const deliveriesRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: deliveryStatusEnum.optional(),
      customerId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getDeliveries(input);
    }),
