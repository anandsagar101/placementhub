from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging
import jwt
import bcrypt

# ------------------------------------------------------------------ setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 7 days

app = FastAPI(title="PlacementHub API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("placementhub")

ROLES = {"student", "company", "admin"}
APPLICATION_STATUSES = ["applied", "under_review", "shortlisted", "interview", "selected", "rejected"]


# ------------------------------------------------------------------ helpers
def now_utc():
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": now_utc() + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def public_user(u: dict) -> dict:
    u = dict(u)
    u.pop("_id", None)
    u.pop("password_hash", None)
    return u


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload.get("sub")})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return public_user(user)


def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")
        return user
    return checker


# ------------------------------------------------------------------ models
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str
    company_name: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    phone: Optional[str] = None
    # student
    branch: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    skills: Optional[List[str]] = None
    bio: Optional[str] = None
    resume_url: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    # company
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    company_size: Optional[str] = None
    about: Optional[str] = None
    logo_url: Optional[str] = None


class JobInput(BaseModel):
    title: str
    description: str
    role_type: str = "Full-time"          # Full-time / Internship / Part-time
    location: str = "Remote"
    ctc_min: Optional[float] = None       # LPA
    ctc_max: Optional[float] = None
    skills: List[str] = []
    eligibility_cgpa: Optional[float] = None
    branches: List[str] = []
    openings: int = 1
    deadline: Optional[str] = None
    experience: str = "Fresher"


class StatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


# ------------------------------------------------------------------ auth routes
def issue_token_response(user: dict, response: Response) -> dict:
    token = create_access_token(user["id"], user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    return {"token": token, "user": public_user(user)}


@api.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    role = body.role.lower()
    if role not in {"student", "company"}:
        raise HTTPException(status_code=400, detail="Role must be student or company.")
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": role,
        "created_at": now_utc().isoformat(),
        "profile_complete": False,
    }
    if role == "company":
        doc["company_name"] = (body.company_name or body.name).strip()
        doc["industry"] = None
        doc["website"] = None
        doc["verified"] = False
    else:
        doc["skills"] = []
        doc["branch"] = None
    await db.users.insert_one(doc)
    return issue_token_response(doc, response)


@api.post("/auth/login")
async def login(body: LoginInput, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return issue_token_response(user, response)


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}


# ------------------------------------------------------------------ profile
@api.put("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        updates["profile_complete"] = True
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]})
    return public_user(fresh)


# ------------------------------------------------------------------ jobs
async def enrich_job(job: dict) -> dict:
    job = dict(job)
    job.pop("_id", None)
    company = await db.users.find_one({"id": job.get("company_id")})
    if company:
        job["company_name"] = company.get("company_name") or company.get("name")
        job["company_logo"] = company.get("logo_url")
        job["company_industry"] = company.get("industry")
    job["applicants_count"] = await db.applications.count_documents({"job_id": job["id"]})
    return job


@api.post("/jobs")
async def create_job(body: JobInput, user: dict = Depends(require_roles("company", "admin"))):
    doc = body.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "company_id": user["id"],
        "status": "active",   # visible immediately; admin can moderate
        "featured": False,
        "created_at": now_utc().isoformat(),
    })
    await db.jobs.insert_one(doc)
    return await enrich_job(doc)


@api.get("/jobs")
async def list_jobs(
    request: Request,
    search: Optional[str] = None,
    role_type: Optional[str] = None,
    mine: bool = False,
):
    query = {}
    # optional auth (public browsing allowed)
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        pass

    if mine and user and user["role"] == "company":
        query["company_id"] = user["id"]
    elif user and user["role"] == "admin":
        pass  # admin sees all
    else:
        query["status"] = "active"

    if role_type and role_type != "all":
        query["role_type"] = role_type
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}},
        ]
    jobs = await db.jobs.find(query).sort("created_at", -1).to_list(500)
    enriched = [await enrich_job(j) for j in jobs]
    # mark applied for students
    if user and user["role"] == "student":
        apps = await db.applications.find({"student_id": user["id"]}).to_list(1000)
        applied_ids = {a["job_id"] for a in apps}
        for j in enriched:
            j["already_applied"] = j["id"] in applied_ids
    return enriched


@api.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return await enrich_job(job)


@api.put("/jobs/{job_id}")
async def update_job(job_id: str, body: JobInput, user: dict = Depends(require_roles("company", "admin"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job posting.")
    await db.jobs.update_one({"id": job_id}, {"$set": body.model_dump()})
    fresh = await db.jobs.find_one({"id": job_id})
    return await enrich_job(fresh)


@api.patch("/jobs/{job_id}/status")
async def set_job_status(job_id: str, body: StatusUpdate, user: dict = Depends(require_roles("company", "admin"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job posting.")
    await db.jobs.update_one({"id": job_id}, {"$set": {"status": body.status}})
    return {"message": "updated"}


@api.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(require_roles("company", "admin"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job posting.")
    await db.jobs.delete_one({"id": job_id})
    await db.applications.delete_many({"job_id": job_id})
    return {"message": "deleted"}


# ------------------------------------------------------------------ applications
@api.post("/jobs/{job_id}/apply")
async def apply_job(job_id: str, user: dict = Depends(require_roles("student"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job or job.get("status") != "active":
        raise HTTPException(status_code=404, detail="Job not available")
    if await db.applications.find_one({"job_id": job_id, "student_id": user["id"]}):
        raise HTTPException(status_code=400, detail="You have already applied to this job.")
    ts = now_utc().isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "job_id": job_id,
        "company_id": job["company_id"],
        "student_id": user["id"],
        "status": "applied",
        "created_at": ts,
        "timeline": [{"status": "applied", "at": ts, "note": "Application submitted"}],
    }
    await db.applications.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def enrich_application(app_doc: dict, include_student=False, include_job=True) -> dict:
    app_doc = dict(app_doc)
    app_doc.pop("_id", None)
    if include_job:
        job = await db.jobs.find_one({"id": app_doc["job_id"]})
        if job:
            app_doc["job"] = await enrich_job(job)
    if include_student:
        student = await db.users.find_one({"id": app_doc["student_id"]})
        if student:
            app_doc["student"] = public_user(student)
    return app_doc


@api.get("/applications/me")
async def my_applications(user: dict = Depends(require_roles("student"))):
    apps = await db.applications.find({"student_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [await enrich_application(a) for a in apps]


@api.get("/jobs/{job_id}/applications")
async def job_applications(job_id: str, user: dict = Depends(require_roles("company", "admin"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job posting.")
    apps = await db.applications.find({"job_id": job_id}).sort("created_at", -1).to_list(1000)
    return [await enrich_application(a, include_student=True) for a in apps]


@api.get("/applications/received")
async def received_applications(user: dict = Depends(require_roles("company"))):
    apps = await db.applications.find({"company_id": user["id"]}).sort("created_at", -1).to_list(2000)
    return [await enrich_application(a, include_student=True) for a in apps]


@api.patch("/applications/{app_id}/status")
async def update_application_status(app_id: str, body: StatusUpdate, user: dict = Depends(require_roles("company", "admin"))):
    if body.status not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    app_doc = await db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if user["role"] != "admin" and app_doc["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your applicant.")
    entry = {"status": body.status, "at": now_utc().isoformat(), "note": body.note or f"Marked as {body.status}"}
    await db.applications.update_one(
        {"id": app_id},
        {"$set": {"status": body.status}, "$push": {"timeline": entry}},
    )
    fresh = await db.applications.find_one({"id": app_id})
    return await enrich_application(fresh, include_student=True)


# ------------------------------------------------------------------ analytics
@api.get("/company/stats")
async def company_stats(user: dict = Depends(require_roles("company"))):
    job_ids = [j["id"] for j in await db.jobs.find({"company_id": user["id"]}).to_list(500)]
    total_jobs = len(job_ids)
    active_jobs = await db.jobs.count_documents({"company_id": user["id"], "status": "active"})
    total_apps = await db.applications.count_documents({"company_id": user["id"]})
    hired = await db.applications.count_documents({"company_id": user["id"], "status": "selected"})
    shortlisted = await db.applications.count_documents({"company_id": user["id"], "status": "shortlisted"})
    # status distribution
    dist = {}
    for s in APPLICATION_STATUSES:
        dist[s] = await db.applications.count_documents({"company_id": user["id"], "status": s})
    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applications": total_apps,
        "hired": hired,
        "shortlisted": shortlisted,
        "status_distribution": [{"status": k, "count": v} for k, v in dist.items()],
    }


@api.get("/student/stats")
async def student_stats(user: dict = Depends(require_roles("student"))):
    apps = await db.applications.find({"student_id": user["id"]}).to_list(1000)
    total = len(apps)
    counts = {s: 0 for s in APPLICATION_STATUSES}
    for a in apps:
        counts[a["status"]] = counts.get(a["status"], 0) + 1
    active_jobs = await db.jobs.count_documents({"status": "active"})
    return {
        "total_applications": total,
        "shortlisted": counts["shortlisted"] + counts["interview"],
        "selected": counts["selected"],
        "open_jobs": active_jobs,
        "status_distribution": [{"status": k, "count": v} for k, v in counts.items()],
    }


@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_roles("admin"))):
    total_students = await db.users.count_documents({"role": "student"})
    total_companies = await db.users.count_documents({"role": "company"})
    total_jobs = await db.jobs.count_documents({})
    total_apps = await db.applications.count_documents({})
    placed = await db.applications.count_documents({"status": "selected"})
    placement_rate = round((placed / total_students * 100), 1) if total_students else 0

    # status distribution
    status_dist = []
    for s in APPLICATION_STATUSES:
        status_dist.append({"status": s, "count": await db.applications.count_documents({"status": s})})

    # top companies by applications
    pipeline = [{"$group": {"_id": "$company_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}, {"$limit": 6}]
    top = await db.applications.aggregate(pipeline).to_list(6)
    top_companies = []
    for t in top:
        c = await db.users.find_one({"id": t["_id"]})
        if c:
            top_companies.append({"name": c.get("company_name") or c.get("name"), "applications": t["count"]})

    # applications trend (last 6 months)
    trend = []
    now = now_utc()
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1)
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        cnt = await db.applications.count_documents({
            "created_at": {"$gte": month_start.isoformat(), "$lt": next_month.isoformat()}
        })
        placed_cnt = await db.applications.count_documents({
            "status": "selected",
            "created_at": {"$gte": month_start.isoformat(), "$lt": next_month.isoformat()}
        })
        trend.append({"month": month_start.strftime("%b"), "applications": cnt, "placed": placed_cnt})

    return {
        "total_students": total_students,
        "total_companies": total_companies,
        "total_jobs": total_jobs,
        "total_applications": total_apps,
        "placed": placed,
        "placement_rate": placement_rate,
        "status_distribution": status_dist,
        "top_companies": top_companies,
        "trend": trend,
    }


@api.get("/admin/users")
async def admin_users(role: Optional[str] = None, user: dict = Depends(require_roles("admin"))):
    query = {}
    if role and role in ROLES:
        query["role"] = role
    users = await db.users.find(query).sort("created_at", -1).to_list(2000)
    result = []
    for u in users:
        pu = public_user(u)
        if u["role"] == "student":
            pu["applications_count"] = await db.applications.count_documents({"student_id": u["id"]})
        if u["role"] == "company":
            pu["jobs_count"] = await db.jobs.count_documents({"company_id": u["id"]})
        result.append(pu)
    return result


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target or target["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete this user.")
    await db.users.delete_one({"id": user_id})
    await db.jobs.delete_many({"company_id": user_id})
    await db.applications.delete_many({"$or": [{"student_id": user_id}, {"company_id": user_id}]})
    return {"message": "deleted"}


@api.get("/")
async def root():
    return {"message": "PlacementHub API running"}


@api.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ seed
async def seed():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "Placement Cell Admin", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "admin",
            "created_at": now_utc().isoformat(), "profile_complete": True,
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # demo data only once
    if await db.users.count_documents({"role": "company"}) == 0:
        await seed_demo_data()


async def seed_demo_data():
    companies = [
        {"company_name": "Nimbus Cloud", "industry": "Cloud & DevOps", "email": "hr@nimbuscloud.com"},
        {"company_name": "Quantic Labs", "industry": "AI / ML", "email": "talent@quanticlabs.com"},
        {"company_name": "FinEdge", "industry": "FinTech", "email": "careers@finedge.com"},
    ]
    company_ids = []
    for c in companies:
        cid = str(uuid.uuid4())
        company_ids.append(cid)
        await db.users.insert_one({
            "id": cid, "name": c["company_name"], "email": c["email"],
            "password_hash": hash_password("Company@123"), "role": "company",
            "company_name": c["company_name"], "industry": c["industry"],
            "website": "https://example.com", "verified": True,
            "created_at": now_utc().isoformat(), "profile_complete": True,
        })

    students = [
        {"name": "Aarav Sharma", "email": "aarav@student.com", "branch": "CSE", "cgpa": 8.7},
        {"name": "Diya Patel", "email": "diya@student.com", "branch": "IT", "cgpa": 9.1},
        {"name": "Kabir Singh", "email": "kabir@student.com", "branch": "ECE", "cgpa": 7.9},
    ]
    student_ids = []
    for s in students:
        sid = str(uuid.uuid4())
        student_ids.append(sid)
        await db.users.insert_one({
            "id": sid, "name": s["name"], "email": s["email"],
            "password_hash": hash_password("Student@123"), "role": "student",
            "branch": s["branch"], "cgpa": s["cgpa"], "degree": "B.Tech",
            "graduation_year": 2026, "skills": ["Python", "React", "SQL"],
            "created_at": now_utc().isoformat(), "profile_complete": True,
        })

    jobs = [
        {"title": "Software Engineer", "role_type": "Full-time", "location": "Bengaluru",
         "ctc_min": 12, "ctc_max": 18, "skills": ["Java", "Spring", "AWS"], "branches": ["CSE", "IT"]},
        {"title": "ML Engineer Intern", "role_type": "Internship", "location": "Remote",
         "ctc_min": 6, "ctc_max": 9, "skills": ["Python", "PyTorch", "NLP"], "branches": ["CSE", "IT", "ECE"]},
        {"title": "Frontend Developer", "role_type": "Full-time", "location": "Pune",
         "ctc_min": 8, "ctc_max": 14, "skills": ["React", "TypeScript", "CSS"], "branches": ["CSE", "IT"]},
        {"title": "Backend Developer", "role_type": "Full-time", "location": "Hyderabad",
         "ctc_min": 10, "ctc_max": 16, "skills": ["Node.js", "MongoDB", "Docker"], "branches": ["CSE", "IT"]},
    ]
    import random
    job_ids = []
    for i, j in enumerate(jobs):
        jid = str(uuid.uuid4())
        job_ids.append(jid)
        await db.jobs.insert_one({
            "id": jid, "company_id": company_ids[i % len(company_ids)],
            "status": "active", "featured": i == 0,
            "description": f"We are hiring a {j['title']} to join our growing engineering team. "
                           f"You will collaborate on high-impact products and modern tech stacks.",
            "eligibility_cgpa": 7.0, "openings": random.randint(2, 6),
            "experience": "Fresher", "deadline": None,
            "created_at": now_utc().isoformat(), **j,
        })

    statuses = ["applied", "under_review", "shortlisted", "selected"]
    for si, sid in enumerate(student_ids):
        for ji, jid in enumerate(job_ids[:3]):
            ts = now_utc().isoformat()
            st = statuses[(si + ji) % len(statuses)]
            await db.applications.insert_one({
                "id": str(uuid.uuid4()), "job_id": jid,
                "company_id": (await db.jobs.find_one({"id": jid}))["company_id"],
                "student_id": sid, "status": st, "created_at": ts,
                "timeline": [{"status": "applied", "at": ts, "note": "Application submitted"}],
            })
    logger.info("Demo data seeded.")


@app.on_event("startup")
async def startup():
    await seed()


@app.on_event("shutdown")
async def shutdown():
    client.close()
