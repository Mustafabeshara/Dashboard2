# User Management & Authorization Guide

## Overview

This guide explains how to create users, manage roles, and control access permissions in the Medical Distribution Dashboard.

---

## 1. User Roles & Hierarchy

### Role Levels (Highest to Lowest)

```
ADMIN           (8) - Full system access, user management
CEO             (7) - Executive oversight, all approvals
CFO             (6) - Financial control, up to 100K KWD
FINANCE_MANAGER (5) - Finance operations, up to 50K KWD
MANAGER         (4) - Department management, up to 10K KWD
FINANCE         (3) - Finance staff, view-only budgets
SALES           (2) - Sales operations, tender management
WAREHOUSE       (1) - Inventory management only
```

---

## 2. Creating Users

### Option A: Via Admin Dashboard (UI)

1. **Login as ADMIN**
   - URL: http://localhost:3000
   - Email: admin@beshara.com
   - Password: admin123

2. **Navigate to User Management**
   - Sidebar → Admin → Users

3. **Click "Create User"**
   - Email: (required, unique)
   - Full Name: (required)
   - Password: (required, min 8 characters)
   - Role: (select from dropdown)
   - Department: (optional)
   - Phone: (optional)

4. **Click "Save"**

### Option B: Via API

**Endpoint:** `POST /api/admin/users`

**Headers:**

```json
{
  "Content-Type": "application/json",
  "Cookie": "next-auth.session-token=<your-session-token>"
}
```

**Body:**

```json
{
  "email": "john.doe@beshara.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "MANAGER",
  "department": "Sales",
  "phone": "+965-1234-5678"
}
```

**Example with cURL:**

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@beshara.com",
    "password": "SecurePass123!",
    "fullName": "John Doe",
    "role": "MANAGER",
    "department": "Sales"
  }'
```

### Option C: Via Database Seed Script

Add users to `prisma/seed.ts`:

```typescript
const newUser = await prisma.user.create({
  data: {
    email: 'user@beshara.com',
    passwordHash: await bcrypt.hash('password123', 10),
    fullName: 'User Name',
    role: 'MANAGER',
    department: 'Sales',
    phone: '+965-1234-5678',
    isActive: true,
  },
});
```

Then run:

```bash
npm run db:seed
```

---

## 3. Permission System

### Resource-Based Permissions

The system uses **RBAC (Role-Based Access Control)** with granular permissions per resource:

#### **Budgets**

- **View**: ADMIN, CEO, CFO, FINANCE_MANAGER, MANAGER, FINANCE
- **Create**: ADMIN, CEO, CFO, FINANCE_MANAGER
- **Update**: ADMIN, CEO, CFO, FINANCE_MANAGER
- **Delete**: ADMIN, CEO, CFO
- **Approve**: ADMIN, CEO, CFO, FINANCE_MANAGER, MANAGER

#### **Tenders**

- **View**: ADMIN, CEO, CFO, FINANCE_MANAGER, MANAGER, SALES
- **Create**: ADMIN, CEO, MANAGER, SALES
- **Update**: ADMIN, CEO, MANAGER, SALES
- **Delete**: ADMIN, CEO

#### **Users**

- **View**: ADMIN, CEO, CFO, FINANCE_MANAGER, MANAGER
- **Create**: ADMIN only
- **Update**: ADMIN, CEO
- **Delete**: ADMIN only

#### **Inventory**

- **View**: ADMIN, CEO, MANAGER, WAREHOUSE, SALES
- **Create**: ADMIN, MANAGER, WAREHOUSE
- **Update**: ADMIN, MANAGER, WAREHOUSE
- **Delete**: ADMIN, MANAGER

#### **Reports**

- **View**: ADMIN, CEO, CFO, FINANCE_MANAGER, MANAGER
- **Export**: ADMIN, CEO, CFO, FINANCE_MANAGER

### Budget Approval Thresholds

Approval required based on transaction amount:

| Amount (KWD) | Required Approver       |
| ------------ | ----------------------- |
| < 1,000      | Auto-approve or MANAGER |
| 1K - 10K     | MANAGER                 |
| 10K - 50K    | FINANCE_MANAGER         |
| 50K - 100K   | CFO                     |
| > 100K       | CEO                     |

---

## 4. Implementing Authorization in Code

### In API Routes

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission, hasPermission } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  // 1. Get session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check permission
  try {
    requirePermission(session, 'budgets', 'view');
  } catch (error) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Proceed with logic
  // ...
}
```

### In React Components

```typescript
'use client'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/rbac'

export default function BudgetDashboard() {
  const { data: session } = useSession()

  const canCreate = hasPermission(session, 'budgets', 'create')
  const canDelete = hasPermission(session, 'budgets', 'delete')

  return (
    <div>
      {canCreate && (
        <button>Create Budget</button>
      )}

      {canDelete && (
        <button>Delete Budget</button>
      )}
    </div>
  )
}
```

### Check Role Hierarchy

```typescript
import { hasMinimumRole } from '@/lib/rbac';

// Check if user has at least MANAGER role
if (hasMinimumRole(session.user.role, 'MANAGER')) {
  // User is MANAGER or higher (FINANCE_MANAGER, CFO, CEO, ADMIN)
}
```

### Check Budget Approval Authority

```typescript
import { canApproveBudget } from '@/lib/rbac';

const amount = 25000; // 25K KWD
const userRole = session.user.role;

if (canApproveBudget(userRole, amount)) {
  // User can approve this transaction
}
```

---

## 5. Managing Existing Users

### Update User (ADMIN only)

**Endpoint:** `PATCH /api/admin/users/:id`

```bash
curl -X PATCH http://localhost:3000/api/admin/users/123 \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Smith",
    "role": "CFO",
    "department": "Finance",
    "isActive": true
  }'
```

### Deactivate User (soft delete)

```bash
curl -X PATCH http://localhost:3000/api/admin/users/123 \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false }'
```

### Delete User (hard delete - ADMIN only)

```bash
curl -X DELETE http://localhost:3000/api/admin/users/123
```

### Reset Password

```bash
curl -X POST http://localhost:3000/api/admin/users/123/reset-password \
  -H "Content-Type: application/json" \
  -d '{ "newPassword": "NewSecurePass123!" }'
```

---

## 6. Best Practices

### Security

1. ✅ **Always check authentication first** - `getServerSession(authOptions)`
2. ✅ **Use `requirePermission()` for strict checks** - throws error if unauthorized
3. ✅ **Use `hasPermission()` for conditional UI** - returns boolean
4. ✅ **Hash passwords with bcrypt** - min 10 rounds
5. ✅ **Validate input** - check required fields, email format

### User Management

1. ✅ **Use unique emails** - enforced by database
2. ✅ **Set strong passwords** - min 8 characters, complexity rules
3. ✅ **Soft delete users** - set `isActive: false` instead of hard delete
4. ✅ **Audit all changes** - log user creation/updates/deletions
5. ✅ **Limit ADMIN role** - only create for trusted administrators

### Role Assignment

1. ✅ **Follow least privilege** - assign minimum required role
2. ✅ **Use department field** - for filtering and reporting
3. ✅ **Review roles quarterly** - ensure permissions are still appropriate
4. ✅ **Document role changes** - maintain audit trail

---

## 7. Testing Permissions

### Quick Test Script

Create `scripts/test-permissions.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { hasPermission } from '@/lib/rbac';

const prisma = new PrismaClient();

async function testPermissions() {
  const user = await prisma.user.findUnique({
    where: { email: 'manager@beshara.com' },
  });

  const mockSession = {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
    },
  };

  console.log('Testing permissions for:', user.email, '(', user.role, ')');
  console.log('Can view budgets:', hasPermission(mockSession, 'budgets', 'view'));
  console.log('Can create budgets:', hasPermission(mockSession, 'budgets', 'create'));
  console.log('Can delete budgets:', hasPermission(mockSession, 'budgets', 'delete'));
  console.log('Can view users:', hasPermission(mockSession, 'users', 'view'));
  console.log('Can create users:', hasPermission(mockSession, 'users', 'create'));
}

testPermissions();
```

Run with:

```bash
npx tsx scripts/test-permissions.ts
```

---

## 8. Common Use Cases

### Create Sales User

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sales@beshara.com",
    "password": "Sales2024!",
    "fullName": "Sales Representative",
    "role": "SALES",
    "department": "Sales"
  }'
```

### Create Warehouse Manager

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "warehouse@beshara.com",
    "password": "Warehouse2024!",
    "fullName": "Warehouse Manager",
    "role": "WAREHOUSE",
    "department": "Logistics"
  }'
```

### Promote User to CFO

```bash
curl -X PATCH http://localhost:3000/api/admin/users/123 \
  -H "Content-Type: application/json" \
  -d '{
    "role": "CFO",
    "department": "Finance"
  }'
```

---

## 9. Troubleshooting

### "Unauthorized" Error

- Check if user is logged in: `session?.user` exists
- Verify session token is valid

### "Forbidden" Error

- User doesn't have required permission
- Check role in `src/lib/rbac.ts` PERMISSIONS object
- Verify role hierarchy in ROLE_HIERARCHY

### Can't Create Users

- Only ADMIN role can create users
- Check if email already exists
- Verify all required fields are provided

### Budget Approval Failing

- Check transaction amount vs user's approval threshold
- See `canApproveBudget()` in `src/lib/rbac.ts`
- Verify user role in `getRequiredApprovalLevel()`

---

## 10. Reference Files

**Core Files:**

- `/src/lib/auth.ts` - Authentication configuration
- `/src/lib/rbac.ts` - Permission system
- `/src/app/api/admin/users/route.ts` - User CRUD API
- `/src/types/index.ts` - Type definitions
- `/prisma/seed.ts` - Database seeding

**Permission Checking:**

- `hasPermission(session, resource, action)` - Returns boolean
- `requirePermission(session, resource, action)` - Throws error if unauthorized
- `hasRole(session, allowedRoles)` - Check if user has specific role
- `hasMinimumRole(userRole, minimumRole)` - Check role hierarchy
- `canApproveBudget(role, amount)` - Check budget approval authority

---

## Questions?

For more details, see:

- `START_HERE.md` - Full project documentation
- `QUICK_START.md` - Getting started guide
- `SECURITY.md` - Security best practices
