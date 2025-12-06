/**
 * OpenAPI/Swagger Configuration
 * API Documentation for Medical Distribution Dashboard
 */

import { createSwaggerSpec } from 'next-swagger-doc'

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Medical Distribution Dashboard API',
        version: '1.0.0',
        description: `
## Overview
REST API for the Medical Distribution Dashboard system.

## Authentication
All API endpoints (except /api/auth/*) require authentication via NextAuth.js session.
Include session cookie in requests or use Bearer token.

## Rate Limiting
API requests are rate-limited to prevent abuse:
- 100 requests per minute for general endpoints
- 20 requests per minute for AI processing endpoints
- 500 requests per minute for read-only operations

## Error Handling
All endpoints return consistent error responses:
\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`
        `,
        contact: {
          name: 'Beshara Group',
          email: 'm.beshara@besharagroup.com',
        },
        license: {
          name: 'Proprietary',
        },
      },
      servers: [
        {
          url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
          description: 'Main server',
        },
      ],
      tags: [
        { name: 'Authentication', description: 'User authentication and session management' },
        { name: 'Users', description: 'User management operations' },
        { name: 'Budgets', description: 'Budget management and approvals' },
        { name: 'Expenses', description: 'Expense tracking and reporting' },
        { name: 'Invoices', description: 'Invoice management' },
        { name: 'Tenders', description: 'Tender management and bidding' },
        { name: 'Documents', description: 'Document upload and AI processing' },
        { name: 'Inventory', description: 'Inventory and product management' },
        { name: 'Customers', description: 'Customer relationship management' },
        { name: 'Suppliers', description: 'Supplier management' },
        { name: 'Reports', description: 'Report generation' },
        { name: 'AI', description: 'AI processing endpoints' },
        { name: 'System', description: 'System health and utilities' },
      ],
      components: {
        securitySchemes: {
          sessionAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'next-auth.session-token',
            description: 'NextAuth.js session cookie',
          },
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
              error: { type: 'string', description: 'Error message' },
              code: { type: 'string', description: 'Error code' },
              details: { type: 'object', description: 'Additional error details' },
            },
            required: ['error'],
          },
          Pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', minimum: 1, default: 1 },
              limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              fullName: { type: 'string' },
              role: { type: 'string', enum: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'FINANCE', 'MANAGER', 'STAFF', 'VIEWER'] },
              department: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Budget: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string' },
              totalAmount: { type: 'number' },
              spentAmount: { type: 'number' },
              currency: { type: 'string', default: 'KWD' },
              fiscalYear: { type: 'integer' },
              status: { type: 'string', enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] },
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Tender: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenderNumber: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              organization: { type: 'string' },
              estimatedValue: { type: 'number' },
              currency: { type: 'string', default: 'KWD' },
              status: { type: 'string', enum: ['DRAFT', 'OPEN', 'SUBMITTED', 'EVALUATION', 'WON', 'LOST', 'CANCELLED'] },
              submissionDeadline: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Document: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              originalName: { type: 'string' },
              mimeType: { type: 'string' },
              size: { type: 'integer' },
              url: { type: 'string', format: 'uri' },
              type: { type: 'string' },
              status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'] },
              moduleType: { type: 'string' },
              moduleId: { type: 'string' },
              extractedData: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Invoice: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              invoiceNumber: { type: 'string' },
              vendorName: { type: 'string' },
              amount: { type: 'number' },
              tax: { type: 'number' },
              totalAmount: { type: 'number' },
              currency: { type: 'string', default: 'KWD' },
              status: { type: 'string', enum: ['DRAFT', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'] },
              dueDate: { type: 'string', format: 'date' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Currency: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'KWD' },
              name: { type: 'string', example: 'Kuwaiti Dinar' },
              symbol: { type: 'string', example: 'KD' },
              decimals: { type: 'integer', example: 3 },
              rate: { type: 'number', description: 'Exchange rate to base currency (KWD)' },
            },
          },
        },
        responses: {
          UnauthorizedError: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
              },
            },
          },
          ForbiddenError: {
            description: 'Insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' },
              },
            },
          },
          NotFoundError: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Not found', code: 'NOT_FOUND' },
              },
            },
          },
          ValidationError: {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Validation failed', code: 'VALIDATION_ERROR', details: {} },
              },
            },
          },
        },
      },
      security: [{ sessionAuth: [] }],
    },
  })
  return spec
}
