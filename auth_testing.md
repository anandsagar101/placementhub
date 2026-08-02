# Auth Testing – PlacementHub

Token model: JWT Bearer (returned in JSON `token`) + httpOnly cookie fallback.
Frontend stores token in localStorage (`ph_token`) and sends `Authorization: Bearer`.

## Accounts (seeded)
- Admin: admin@placementhub.com / Admin@123 (role: admin)
- Company: hr@nimbuscloud.com / Company@123 (role: company)
- Student: aarav@student.com / Student@123 (role: student)

## API checks
```
curl -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@placementhub.com","password":"Admin@123"}'
# -> {token, user}

TOKEN=... ; curl http://localhost:8001/api/auth/me -H "Authorization: Bearer $TOKEN"
```

## Endpoints
- POST /api/auth/register {name,email,password,role,company_name?}
- POST /api/auth/login {email,password}
- GET  /api/auth/me
- POST /api/auth/logout
- PUT  /api/profile
- GET/POST /api/jobs ; GET/PUT/DELETE /api/jobs/{id} ; PATCH /api/jobs/{id}/status
- POST /api/jobs/{id}/apply ; GET /api/jobs/{id}/applications
- GET /api/applications/me ; GET /api/applications/received ; PATCH /api/applications/{id}/status
- GET /api/student/stats ; /api/company/stats ; /api/admin/stats
- GET /api/admin/users ; DELETE /api/admin/users/{id}
