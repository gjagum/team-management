# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

All API endpoints (except `/auth/login`) require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

Success responses:
```json
{
  "data": {...},
  "message": "Success message"
}
```

Error responses:
```json
{
  "error": "Error message"
}
```

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@team.com",
  "password": "admin123"
}
```

Response:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "admin@team.com",
    "fullName": "Admin User",
    "role": "ADMIN",
    "employee": {...}
  }
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

### Users

#### List All Users
```http
GET /users
Authorization: Bearer <token>
```

Requires: `users.read`

#### Get User by ID
```http
GET /users/:id
Authorization: Bearer <token>
```

Requires: `users.read`

#### Create User
```http
POST /users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@team.com",
  "password": "password123",
  "fullName": "New User",
  "role": "EMPLOYEE"
}
```

Requires: `users.create`

#### Update User
```http
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "role": "MANAGER"
}
```

Requires: `users.update`

#### Delete User
```http
DELETE /users/:id
Authorization: Bearer <token>
```

Requires: `users.delete`

### Employees

#### List All Employees
```http
GET /employees
Authorization: Bearer <token>
```

Requires: `employees.read`

#### Get Employee by ID
```http
GET /employees/:id
Authorization: Bearer <token>
```

Requires: `employees.read`

#### Create Employee
```http
POST /employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 1,
  "employeeCode": "EMP004",
  "department": "Engineering",
  "position": "Developer",
  "hireDate": "2024-01-01",
  "salary": 60000
}
```

Requires: `employees.create`

#### Update Employee
```http
PUT /employees/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "department": "Updated Department",
  "position": "Senior Developer"
}
```

Requires: `employees.update`

#### Delete Employee
```http
DELETE /employees/:id
Authorization: Bearer <token>
```

Requires: `employees.delete`

### Leaves

#### List All Leave Requests
```http
GET /leaves
Authorization: Bearer <token>
```

Requires: `leaves.read`

#### Get My Leave Requests
```http
GET /leaves/my-requests
Authorization: Bearer <token>
```

Requires: `leaves.read`

#### Get Leave Balance
```http
GET /leaves/balance?year=2024
Authorization: Bearer <token>
```

Requires: `leaves.read`

#### Create Leave Request
```http
POST /leaves
Authorization: Bearer <token>
Content-Type: application/json

{
  "leaveType": "ANNUAL",
  "startDate": "2024-06-01",
  "endDate": "2024-06-03",
  "reason": "Family vacation"
}
```

Requires: `leaves.create`

#### Approve/Reject Leave Request
```http
PATCH /leaves/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "reviewNotes": "Approved"
}
```

Requires: `leaves.approve`

#### Cancel Leave Request
```http
DELETE /leaves/:id
Authorization: Bearer <token>
```

Requires: `leaves.delete`

### Overtime

#### List All Overtime Records
```http
GET /overtime
Authorization: Bearer <token>
```

Requires: `overtime.read`

#### Get My Overtime Records
```http
GET /overtime/my-records
Authorization: Bearer <token>
```

Requires: `overtime.read`

#### Create Overtime Record
```http
POST /overtime
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2024-06-01",
  "startTime": "2024-06-01T18:00:00",
  "endTime": "2024-06-01T22:00:00",
  "description": "Project deadline"
}
```

Requires: `overtime.create`

#### Approve/Reject Overtime Record
```http
PATCH /overtime/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "approvalNotes": "Approved"
}
```

Requires: `overtime.approve`

#### Cancel Overtime Record
```http
DELETE /overtime/:id
Authorization: Bearer <token>
```

Requires: `overtime.delete`

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Error Responses

```json
{
  "error": "Error description here"
}
```

Common errors:
- "No token provided"
- "Invalid token"
- "Insufficient permissions"
- "User not found"
- "Invalid credentials"
- "Leave request not found"
- "Overtime record not found"
