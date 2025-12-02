 * @deprecated This file is kept for backward compatibility.
 * Import from './routers/index' instead.
 *
 * The router has been split into domain-specific modules:
 * - ./routers/auth.router.ts
 * - ./routers/manufacturers.router.ts
 * - ./routers/products.router.ts
 * - ./routers/tenders.router.ts
 * - ./routers/inventory.router.ts
 * - ./routers/documents.router.ts
 * - ./routers/analytics.router.ts
 * - ./routers/notifications.router.ts
 * - ./routers/assistant.router.ts
 * - ./routers/crud.routers.ts (tasks, timesheet, customers, forecasts, deliveries, invoices, expenses, chat)
 */

export { appRouter, type AppRouter } from "./routers/index";
