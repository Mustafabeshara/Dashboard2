/**
 * Swagger/OpenAPI Configuration
 * API documentation setup
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Dashboard2 API',
    version: '1.0.0',
    description: 'Medical Distribution Management System API Documentation',
    contact: {
      name: 'API Support',
      email: 'support@dashboard2.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://dashboard2.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          total: { type: 'number' },
          totalPages: { type: 'number' },
        },
      },
      Tender: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenderNumber: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED'],
          },
          estimatedValue: { type: 'number', nullable: true },
          currency: { type: 'string' },
          submissionDeadline: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['GOVERNMENT', 'PRIVATE', 'INDIVIDUAL'] },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          invoiceNumber: { type: 'string' },
          customerId: { type: 'string', format: 'uuid' },
          totalAmount: { type: 'number' },
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] },
          invoiceDate: { type: 'string', format: 'date-time' },
          dueDate: { type: 'string', format: 'date-time' },
        },
      },
      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          expenseNumber: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          amount: { type: 'number' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
          expenseDate: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    { name: 'Tenders', description: 'Tender management endpoints' },
    { name: 'Customers', description: 'Customer management endpoints' },
    { name: 'Invoices', description: 'Invoice management endpoints' },
    { name: 'Expenses', description: 'Expense management endpoints' },
    { name: 'Suppliers', description: 'Supplier management endpoints' },
    { name: 'Documents', description: 'Document management endpoints' },
    { name: 'Reports', description: 'Report generation endpoints' },
    { name: 'Budgets', description: 'Budget management endpoints' },
  ],
}

export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: ['./src/app/api/**/*.ts'],
}
