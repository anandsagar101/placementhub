from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
import json
import time
import re
import secrets
import jwt
import bcrypt
import cloudinary
import cloudinary.utils
import cloudinary.uploader

# ------------------------------------------------------------------ setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)

app = FastAPI(title="PlacementHub API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("placementhub")

APPLICATION_STATUSES = ["applied", "under_review", "shortlisted", "interview", "selected", "rejected"]
ADMIN_ROLES = ["super_admin", "placement_officer", "department_coordinator"]
DOC_TYPES = ["profile_photo", "resume", "marksheet_10", "marksheet_12", "semester_marksheet",
             "aadhar", "pan", "certificate", "offer_letter", "portfolio", "other"]
MANDATORY_DOCS = ["resume", "marksheet_10", "marksheet_12"]
MANDATORY_FIELDS = ["phone", "branch", "degree", "graduation_year", "cgpa"]
FREEZE_REASONS = ["Already Placed", "Disciplinary Action", "Academic Issue", "Placement Policy", "Manual"]

# permission -> which admin_roles have it
PERMISSIONS = {
    "verify_students": {"super_admin", "placement_officer", "department_coordinator"},
    "verify_documents": {"super_admin", "placement_officer", "department_coordinator"},
    "manage_students": {"super_admin", "placement_officer", "department_coordinator"},
    "freeze_students": {"super_admin", "placement_officer"},
    "approve_recruiters": {"super_admin", "placement_officer"},
    "moderate_jobs": {"super_admin", "placement_officer"},
    "view_audit": {"super_admin", "placement_officer"},
    "manage_staff": {"super_admin"},
    "delete_users": {"super_admin"},
    "view_dashboard": {"super_admin", "placement_officer", "department_coordinator"},
}


# ------------------------------------------------------------------ helpers
def now_utc():
    return datetime.now(timezone.utc)


def now_iso():
    return now_utc().isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role, "type": "access",
               "exp": now_utc() + timedelta(minutes=ACCESS_TOKEN_MINUTES)}
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


def require_perm(perm: str):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required.")
        admin_role = user.get("admin_role", "super_admin")
        if admin_role not in PERMISSIONS.get(perm, set()):
            raise HTTPException(status_code=403, detail=f"Your role ({admin_role.replace('_', ' ')}) cannot perform this action.")
        return user
    return checker


async def notify(user_id: str, ntype: str, title: str, message: str, link: Optional[str] = None):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": ntype,
        "title": title, "message": message, "link": link,
        "read": False, "created_at": now_iso(),
    })


async def notify_admins(ntype: str, title: str, message: str, link: Optional[str] = None):
    admins = await db.users.find({"role": "admin"}).to_list(100)
    for a in admins:
        await notify(a["id"], ntype, title, message, link)


async def audit(admin: dict, action: str, target_id: Optional[str] = None,
                target_name: Optional[str] = None, details: Optional[str] = None):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()), "admin_id": admin["id"], "admin_name": admin.get("name"),
        "admin_role": admin.get("admin_role"), "action": action,
        "target_user_id": target_id, "target_name": target_name,
        "details": details, "created_at": now_iso(),
    })


# ---------- profile completion & eligibility ----------
def profile_completion(user: dict) -> dict:
    docs = user.get("documents", {}) or {}
    checks = []
    checks.append(("Phone", bool(user.get("phone"))))
    checks.append(("Branch", bool(user.get("branch"))))
    checks.append(("Department", bool(user.get("department"))))
    checks.append(("Degree", bool(user.get("degree"))))
    checks.append(("Graduation Year", bool(user.get("graduation_year"))))
    checks.append(("CGPA", user.get("cgpa") is not None))
    checks.append(("Skills", bool(user.get("skills"))))
    checks.append(("Projects", bool(user.get("projects"))))
    checks.append(("Certificates", bool(user.get("certificates"))))
    checks.append(("LinkedIn", bool(user.get("linkedin"))))
    checks.append(("Bio", bool(user.get("bio"))))
    checks.append(("Profile Photo", bool(docs.get("profile_photo"))))
    checks.append(("Resume", bool(docs.get("resume"))))
    checks.append(("10th Marksheet", bool(docs.get("marksheet_10"))))
    checks.append(("12th Marksheet", bool(docs.get("marksheet_12"))))
    total = len(checks)
    done = sum(1 for _, ok in checks if ok)
    missing = [label for label, ok in checks if not ok]
    return {"percentage": round(done / total * 100), "missing": missing, "done": done, "total": total}


def mandatory_profile_ok(user: dict) -> dict:
    missing = []
    for f in MANDATORY_FIELDS:
        if not user.get(f) and user.get(f) != 0:
            missing.append(f)
    if not user.get("skills"):
        missing.append("skills")
    docs = user.get("documents", {}) or {}
    for d in MANDATORY_DOCS:
        if not docs.get(d):
            missing.append(d.replace("_", " "))
    return {"ok": len(missing) == 0, "missing": missing}


def eligibility_check(student: dict, job: dict) -> dict:
    checks = []

    def add(label, required, yours, passed):
        checks.append({"label": label, "required": str(required), "yours": str(yours), "pass": passed})

    if job.get("eligibility_cgpa"):
        s = student.get("cgpa") or 0
        add("Minimum CGPA", job["eligibility_cgpa"], s, s >= job["eligibility_cgpa"])
    if job.get("max_backlogs") is not None:
        b = student.get("backlogs") or 0
        add("Maximum Backlogs", job["max_backlogs"], b, b <= job["max_backlogs"])
    if job.get("branches"):
        add("Branch", ", ".join(job["branches"]), student.get("branch") or "—", student.get("branch") in job["branches"])
    if job.get("departments"):
        add("Department", ", ".join(job["departments"]), student.get("department") or "—", student.get("department") in job["departments"])
    if job.get("passing_year"):
        add("Passing Year", job["passing_year"], student.get("graduation_year") or "—", student.get("graduation_year") == job["passing_year"])
    if job.get("gender") and job.get("gender") != "Any":
        add("Gender", job["gender"], student.get("gender") or "—", student.get("gender") == job["gender"])
    if job.get("degree"):
        add("Degree", job["degree"], student.get("degree") or "—", (student.get("degree") or "").lower() == job["degree"].lower())

    reasons = [f"Required {c['label']}: {c['required']} · Yours: {c['yours']}" for c in checks if not c["pass"]]
    return {"eligible": len(reasons) == 0, "reasons": reasons, "checks": checks}


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
    branch: Optional[str] = None
    department: Optional[str] = None
    section: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    backlogs: Optional[int] = None
    gender: Optional[str] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[str]] = None
    certificates: Optional[List[str]] = None
    bio: Optional[str] = None
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
    role_type: str = "Full-time"
    location: str = "Remote"
    ctc_min: Optional[float] = None
    ctc_max: Optional[float] = None
    skills: List[str] = []
    eligibility_cgpa: Optional[float] = None
    max_backlogs: Optional[int] = None
    branches: List[str] = []
    departments: List[str] = []
    passing_year: Optional[int] = None
    gender: Optional[str] = "Any"
    degree: Optional[str] = None
    openings: int = 1
    deadline: Optional[str] = None
    experience: str = "Fresher"
    is_dream_company: bool = False


class StatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


class VerificationDecision(BaseModel):
    status: str  # approved / rejected / changes_requested
    remarks: Optional[str] = None


class FreezeInput(BaseModel):
    frozen: bool
    reason: Optional[str] = None


class DocumentInput(BaseModel):
    doc_type: str
    url: str
    public_id: str
    resource_type: str = "image"
    format: Optional[str] = None


class DocDecision(BaseModel):
    status: str  # verified / rejected / reupload
    remarks: Optional[str] = None


class OfferInput(BaseModel):
    package: float
    role: str
    location: str = ""
    joining_date: Optional[str] = None
    bond: Optional[str] = None
    benefits: Optional[str] = None


class OfferDecision(BaseModel):
    status: str  # accepted / declined


class StaffInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    admin_role: str


class ChatInput(BaseModel):
    message: str


# ------------------------------------------------------------------ auth
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
        "id": str(uuid.uuid4()), "name": body.name.strip(), "email": email,
        "password_hash": hash_password(body.password), "role": role,
        "created_at": now_iso(), "profile_complete": False,
    }
    if role == "company":
        doc.update({
            "company_name": (body.company_name or body.name).strip(),
            "industry": None, "website": None,
            "approval_status": "pending", "approval_remarks": None, "verified": False,
        })
        await db.users.insert_one(doc)
        await notify_admins("recruiter_request", "New recruiter registration",
                            f"{doc['company_name']} has requested to join as a recruiter.", "/app/companies")
    else:
        doc.update({
            "skills": [], "projects": [], "certificates": [], "branch": None, "department": None,
            "backlogs": 0, "documents": {},
            "verification_status": "pending", "verification_remarks": None,
            "verification_date": None, "verified_by": None,
            "frozen": False, "freeze_reason": None,
            "placed": False, "placed_company": None, "placed_package": None,
            "profile_score": None,
        })
        await db.users.insert_one(doc)
        await notify_admins("student_registration", "New student registration",
                            f"{doc['name']} has registered and is awaiting verification.", "/app/students")
        await notify(doc["id"], "verification", "Welcome to PlacementHub",
                     "Your account is pending verification. Complete your profile and upload documents to get verified.")
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
    if user["role"] == "student":
        user["profile_completion"] = profile_completion(user)
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
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]})
    fresh = public_user(fresh)
    comp = profile_completion(fresh)
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile_complete": comp["percentage"] == 100}})
    fresh["profile_completion"] = comp
    return fresh


@api.get("/profile/completion")
async def get_completion(user: dict = Depends(require_roles("student"))):
    full = await db.users.find_one({"id": user["id"]})
    return profile_completion(full)


# ------------------------------------------------------------------ cloudinary
@api.get("/cloudinary/signature")
async def cloudinary_signature(resource_type: str = "image", user: dict = Depends(get_current_user)):
    folder = f"students/{user['id']}"
    timestamp = int(time.time())
    params = {"timestamp": timestamp, "folder": folder}
    signature = cloudinary.utils.api_sign_request(params, os.environ["CLOUDINARY_API_SECRET"])
    return {
        "signature": signature, "timestamp": timestamp,
        "cloud_name": os.environ["CLOUDINARY_CLOUD_NAME"],
        "api_key": os.environ["CLOUDINARY_API_KEY"],
        "folder": folder, "resource_type": resource_type,
    }


@api.post("/documents")
async def upload_document(body: DocumentInput, user: dict = Depends(require_roles("student"))):
    if body.doc_type not in DOC_TYPES:
        raise HTTPException(status_code=400, detail="Invalid document type")
    entry = {
        "url": body.url, "public_id": body.public_id, "resource_type": body.resource_type,
        "format": body.format, "status": "pending", "remarks": None, "uploaded_at": now_iso(),
    }
    await db.users.update_one({"id": user["id"]}, {"$set": {f"documents.{body.doc_type}": entry}})
    await notify_admins("document", "New document uploaded",
                        f"{user['name']} uploaded {body.doc_type.replace('_', ' ')} for verification.", "/app/students")
    fresh = await db.users.find_one({"id": user["id"]})
    return public_user(fresh)


@api.delete("/documents/{doc_type}")
async def delete_document(doc_type: str, user: dict = Depends(require_roles("student"))):
    full = await db.users.find_one({"id": user["id"]})
    doc = (full.get("documents") or {}).get(doc_type)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        cloudinary.uploader.destroy(doc["public_id"], resource_type=doc.get("resource_type", "image"), invalidate=True)
    except Exception as e:
        logger.warning(f"Cloudinary destroy failed: {e}")
    await db.users.update_one({"id": user["id"]}, {"$unset": {f"documents.{doc_type}": ""}})
    return {"message": "deleted"}


@api.patch("/admin/documents/{student_id}/{doc_type}")
async def review_document(student_id: str, doc_type: str, body: DocDecision,
                          admin: dict = Depends(require_perm("verify_documents"))):
    student = await db.users.find_one({"id": student_id})
    if not student or not (student.get("documents") or {}).get(doc_type):
        raise HTTPException(status_code=404, detail="Document not found")
    await db.users.update_one(
        {"id": student_id},
        {"$set": {f"documents.{doc_type}.status": body.status, f"documents.{doc_type}.remarks": body.remarks}},
    )
    await notify(student_id, "document", f"Document {body.status}",
                 f"Your {doc_type.replace('_', ' ')} was marked as {body.status}." + (f" Remark: {body.remarks}" if body.remarks else ""))
    await audit(admin, f"document_{body.status}", student_id, student.get("name"), f"{doc_type}: {body.remarks or ''}")
    return {"message": "updated"}


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
    if user["role"] == "company":
        full = await db.users.find_one({"id": user["id"]})
        if full.get("approval_status") != "approved":
            raise HTTPException(status_code=403, detail="Your recruiter account is pending admin approval. You cannot post jobs yet.")
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "company_id": user["id"], "status": "active",
                "featured": False, "created_at": now_iso()})
    await db.jobs.insert_one(doc)
    return await enrich_job(doc)


@api.get("/jobs")
async def list_jobs(request: Request, search: Optional[str] = None,
                    role_type: Optional[str] = None, mine: bool = False):
    query = {}
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        pass
    if mine and user and user["role"] == "company":
        query["company_id"] = user["id"]
    elif user and user["role"] == "admin":
        pass
    else:
        query["status"] = "active"
    if role_type and role_type != "all":
        query["role_type"] = role_type
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}},
            {"skills": {"$regex": search, "$options": "i"}},
        ]
    jobs = await db.jobs.find(query).sort("created_at", -1).to_list(500)
    enriched = [await enrich_job(j) for j in jobs]
    if user and user["role"] == "student":
        full = await db.users.find_one({"id": user["id"]})
        apps = await db.applications.find({"student_id": user["id"]}).to_list(1000)
        applied_ids = {a["job_id"] for a in apps}
        for j, orig in zip(enriched, jobs):
            j["already_applied"] = j["id"] in applied_ids
            elig = eligibility_check(full, orig)
            j["eligible"] = elig["eligible"]
            j["eligibility_reasons"] = elig["reasons"]
    return enriched


@api.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return await enrich_job(job)


@api.get("/jobs/{job_id}/eligibility")
async def job_eligibility(job_id: str, user: dict = Depends(require_roles("student"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    full = await db.users.find_one({"id": user["id"]})
    result = eligibility_check(full, job)
    # add gating info
    result["verified"] = full.get("verification_status") == "approved"
    result["frozen"] = full.get("frozen") and full.get("freeze_reason") != "Already Placed"
    result["freeze_reason"] = full.get("freeze_reason")
    result["profile"] = mandatory_profile_ok(full)
    result["placed"] = full.get("placed", False)
    return result


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
    if user["role"] == "admin" and user.get("admin_role") not in PERMISSIONS["moderate_jobs"]:
        raise HTTPException(status_code=403, detail="You cannot moderate jobs.")
    await db.jobs.update_one({"id": job_id}, {"$set": {"status": body.status}})
    if user["role"] == "admin":
        await audit(user, f"job_{body.status}", job.get("company_id"), job.get("title"))
    return {"message": "updated"}


@api.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(require_roles("company", "admin"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job posting.")
    if user["role"] == "admin" and user.get("admin_role") not in PERMISSIONS["moderate_jobs"]:
        raise HTTPException(status_code=403, detail="You cannot delete jobs.")
    await db.jobs.delete_one({"id": job_id})
    await db.applications.delete_many({"job_id": job_id})
    if user["role"] == "admin":
        await audit(user, "job_deleted", job.get("company_id"), job.get("title"))
    return {"message": "deleted"}


# ------------------------------------------------------------------ applications
@api.post("/jobs/{job_id}/apply")
async def apply_job(job_id: str, user: dict = Depends(require_roles("student"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job or job.get("status") != "active":
        raise HTTPException(status_code=404, detail="Job not available")
    full = await db.users.find_one({"id": user["id"]})

    if full.get("verification_status") != "approved":
        raise HTTPException(status_code=403, detail="Your profile is not verified yet. Please wait for admin approval.")
    prof = mandatory_profile_ok(full)
    if not prof["ok"]:
        raise HTTPException(status_code=403, detail=f"Complete your profile first. Missing: {', '.join(prof['missing'])}.")
    if full.get("frozen") and full.get("freeze_reason") != "Already Placed":
        raise HTTPException(status_code=403, detail=f"Your account is frozen ({full.get('freeze_reason')}). You cannot apply.")
    if full.get("placed"):
        pkg = full.get("placed_package") or 0
        if not (job.get("is_dream_company") and (job.get("ctc_max") or 0) > pkg):
            raise HTTPException(status_code=403, detail="You are already placed. Only higher-package Dream Company drives are allowed.")
    elig = eligibility_check(full, job)
    if not elig["eligible"]:
        raise HTTPException(status_code=403, detail="You are not eligible: " + "; ".join(elig["reasons"]))
    if await db.applications.find_one({"job_id": job_id, "student_id": user["id"]}):
        raise HTTPException(status_code=400, detail="You have already applied to this job.")

    ts = now_iso()
    doc = {"id": str(uuid.uuid4()), "job_id": job_id, "company_id": job["company_id"],
           "student_id": user["id"], "status": "applied", "created_at": ts,
           "timeline": [{"status": "applied", "at": ts, "note": "Application submitted"}]}
    await db.applications.insert_one(doc)
    await notify(job["company_id"], "application", "New application",
                 f"{full['name']} applied to {job['title']}.", "/app/applicants")
    await notify(user["id"], "application", "Application submitted",
                 f"You applied to {job['title']}. Good luck!", "/app/applications")
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
    entry = {"status": body.status, "at": now_iso(), "note": body.note or f"Marked as {body.status}"}
    await db.applications.update_one({"id": app_id}, {"$set": {"status": body.status}, "$push": {"timeline": entry}})

    job = await db.jobs.find_one({"id": app_doc["job_id"]})
    await notify(app_doc["student_id"], "application", "Application update",
                 f"Your application for {job['title'] if job else 'a job'} is now: {body.status.replace('_', ' ')}.",
                 "/app/applications")

    # auto-create offer on selection
    if body.status == "selected" and not await db.offers.find_one({"application_id": app_id}):
        offer = {
            "id": str(uuid.uuid4()), "application_id": app_id, "job_id": app_doc["job_id"],
            "company_id": app_doc["company_id"], "student_id": app_doc["student_id"],
            "package": job.get("ctc_max") or job.get("ctc_min") or 0,
            "role": job.get("title"), "location": job.get("location"),
            "joining_date": None, "bond": None, "benefits": None,
            "status": "offered", "created_at": now_iso(),
        }
        await db.offers.insert_one(offer)
        await notify(app_doc["student_id"], "offer", "🎉 You received an offer!",
                     f"{job.get('title')} — review and respond in Offers.", "/app/offers")
    fresh = await db.applications.find_one({"id": app_id})
    return await enrich_application(fresh, include_student=True)


# ------------------------------------------------------------------ offers
async def enrich_offer(o: dict) -> dict:
    o = dict(o)
    o.pop("_id", None)
    company = await db.users.find_one({"id": o["company_id"]})
    if company:
        o["company_name"] = company.get("company_name") or company.get("name")
    return o


@api.get("/offers/me")
async def my_offers(user: dict = Depends(require_roles("student"))):
    offers = await db.offers.find({"student_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [await enrich_offer(o) for o in offers]


@api.patch("/offers/{offer_id}")
async def respond_offer(offer_id: str, body: OfferDecision, user: dict = Depends(require_roles("student"))):
    offer = await db.offers.find_one({"id": offer_id, "student_id": user["id"]})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    full = await db.users.find_one({"id": user["id"]})
    if body.status == "accepted":
        if full.get("frozen") and full.get("freeze_reason") != "Already Placed":
            raise HTTPException(status_code=403, detail=f"Account frozen ({full.get('freeze_reason')}). Cannot accept offers.")
        await db.offers.update_one({"id": offer_id}, {"$set": {"status": "accepted"}})
        # decline other pending offers
        await db.offers.update_many(
            {"student_id": user["id"], "id": {"$ne": offer_id}, "status": "offered"},
            {"$set": {"status": "declined"}})
        # placement policy: mark placed + freeze
        await db.users.update_one({"id": user["id"]}, {"$set": {
            "placed": True, "placed_company": offer.get("company_name") or None,
            "placed_package": offer.get("package"),
            "frozen": True, "freeze_reason": "Already Placed",
        }})
        # timeline on application
        await db.applications.update_one(
            {"id": offer["application_id"]},
            {"$push": {"timeline": {"status": "offer_accepted", "at": now_iso(), "note": "Offer accepted — Placed"}}})
        await notify(offer["company_id"], "offer", "Offer accepted",
                     f"{full['name']} accepted your offer for {offer.get('role')}.", "/app/applicants")
    else:
        await db.offers.update_one({"id": offer_id}, {"$set": {"status": "declined"}})
        await notify(offer["company_id"], "offer", "Offer declined",
                     f"{full['name']} declined the offer for {offer.get('role')}.", "/app/applicants")
    fresh = await db.offers.find_one({"id": offer_id})
    return await enrich_offer(fresh)


# ------------------------------------------------------------------ notifications
@api.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    for i in items:
        i.pop("_id", None)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"items": items, "unread": unread}


@api.patch("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "ok"}


@api.patch("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "ok"}


# ------------------------------------------------------------------ student timeline & stats
@api.get("/student/timeline")
async def student_timeline(user: dict = Depends(require_roles("student"))):
    full = await db.users.find_one({"id": user["id"]})
    apps = await db.applications.find({"student_id": user["id"]}).to_list(1000)
    statuses = {a["status"] for a in apps}
    offers = await db.offers.find({"student_id": user["id"]}).to_list(200)
    accepted = any(o["status"] == "accepted" for o in offers)
    prof = mandatory_profile_ok(full)
    stages = [
        {"key": "registration", "label": "Registration", "done": True, "date": full.get("created_at")},
        {"key": "verification", "label": "Verification", "done": full.get("verification_status") == "approved", "date": full.get("verification_date")},
        {"key": "eligible", "label": "Eligible to Apply", "done": full.get("verification_status") == "approved" and prof["ok"]},
        {"key": "applied", "label": "Applied", "done": len(apps) > 0},
        {"key": "shortlisted", "label": "Shortlisted", "done": bool(statuses & {"shortlisted", "interview", "selected"})},
        {"key": "interview", "label": "Interview", "done": bool(statuses & {"interview", "selected"})},
        {"key": "selected", "label": "Selected", "done": "selected" in statuses},
        {"key": "offer_accepted", "label": "Offer Accepted", "done": accepted},
        {"key": "placed", "label": "Placed", "done": full.get("placed", False)},
    ]
    return stages


@api.get("/student/stats")
async def student_stats(user: dict = Depends(require_roles("student"))):
    full = await db.users.find_one({"id": user["id"]})
    apps = await db.applications.find({"student_id": user["id"]}).to_list(1000)
    counts = {s: 0 for s in APPLICATION_STATUSES}
    for a in apps:
        counts[a["status"]] = counts.get(a["status"], 0) + 1
    active_jobs = await db.jobs.count_documents({"status": "active"})
    offers = await db.offers.count_documents({"student_id": user["id"]})
    upcoming_interviews = await db.interviews.count_documents({"student_id": user["id"], "status": {"$in": ["scheduled", "rescheduled"]}})
    open_drives = await db.drives.count_documents({"moderation": "approved", "status": "registration_open"})
    pending_docs = sum(1 for d in (full.get("documents") or {}).values() if d.get("status") == "pending")
    return {
        "total_applications": len(apps),
        "shortlisted": counts["shortlisted"] + counts["interview"],
        "selected": counts["selected"],
        "open_jobs": active_jobs,
        "offers": offers,
        "upcoming_interviews": upcoming_interviews,
        "upcoming_drives": open_drives,
        "pending_documents": pending_docs,
        "verification_status": full.get("verification_status"),
        "frozen": full.get("frozen", False),
        "freeze_reason": full.get("freeze_reason"),
        "placed": full.get("placed", False),
        "profile_completion": profile_completion(full),
        "status_distribution": [{"status": k, "count": v} for k, v in counts.items()],
    }


# ------------------------------------------------------------------ company stats
@api.get("/company/stats")
async def company_stats(user: dict = Depends(require_roles("company"))):
    active_jobs = await db.jobs.count_documents({"company_id": user["id"], "status": "active"})
    total_jobs = await db.jobs.count_documents({"company_id": user["id"]})
    total_apps = await db.applications.count_documents({"company_id": user["id"]})
    hired = await db.applications.count_documents({"company_id": user["id"], "status": "selected"})
    shortlisted = await db.applications.count_documents({"company_id": user["id"], "status": "shortlisted"})
    dist = {}
    for s in APPLICATION_STATUSES:
        dist[s] = await db.applications.count_documents({"company_id": user["id"], "status": s})
    full = await db.users.find_one({"id": user["id"]})
    today = now_utc().date().isoformat()
    todays_interviews = await db.interviews.count_documents({"company_id": user["id"], "date": today})
    upcoming_drives = await db.drives.count_documents({"company_id": user["id"], "status": {"$in": ["registration_open", "upcoming", "ongoing"]}})
    completed_iv = await db.interviews.find({"company_id": user["id"], "status": "completed"}).to_list(1000)
    fb_ids = {f["interview_id"] for f in await db.interview_feedback.find({"company_id": user["id"]}).to_list(1000)}
    pending_feedback = await db.interviews.count_documents({"company_id": user["id"], "status": {"$in": ["completed"]}, "id": {"$nin": list(fb_ids)}})
    return {
        "total_jobs": total_jobs, "active_jobs": active_jobs, "total_applications": total_apps,
        "hired": hired, "shortlisted": shortlisted,
        "todays_interviews": todays_interviews, "upcoming_drives": upcoming_drives,
        "pending_feedback": max(pending_feedback, 0),
        "approval_status": full.get("approval_status", "approved"),
        "status_distribution": [{"status": k, "count": v} for k, v in dist.items()],
    }


# ------------------------------------------------------------------ admin: verification / freeze / approval
@api.patch("/admin/students/{sid}/verification")
async def verify_student(sid: str, body: VerificationDecision, admin: dict = Depends(require_perm("verify_students"))):
    student = await db.users.find_one({"id": sid, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if body.status not in {"approved", "rejected", "changes_requested"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.users.update_one({"id": sid}, {"$set": {
        "verification_status": body.status, "verification_remarks": body.remarks,
        "verification_date": now_iso(), "verified_by": admin["name"],
    }})
    label = {"approved": "approved", "rejected": "rejected", "changes_requested": "returned for changes"}[body.status]
    await notify(sid, "verification", f"Verification {label}",
                 f"Your profile was {label} by the placement cell." + (f" Remark: {body.remarks}" if body.remarks else ""))
    await audit(admin, f"student_{body.status}", sid, student.get("name"), body.remarks)
    return {"message": "updated"}


@api.patch("/admin/students/{sid}/freeze")
async def freeze_student(sid: str, body: FreezeInput, admin: dict = Depends(require_perm("freeze_students"))):
    student = await db.users.find_one({"id": sid, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await db.users.update_one({"id": sid}, {"$set": {
        "frozen": body.frozen, "freeze_reason": body.reason if body.frozen else None}})
    if body.frozen:
        await notify(sid, "freeze", "Account frozen",
                     f"Your account has been frozen. Reason: {body.reason}. You cannot apply or accept offers.")
        await audit(admin, "freeze_student", sid, student.get("name"), body.reason)
    else:
        await notify(sid, "freeze", "Account unfrozen", "Your account has been unfrozen. You can apply again.")
        await audit(admin, "unfreeze_student", sid, student.get("name"))
    return {"message": "updated"}


@api.patch("/admin/companies/{cid}/approval")
async def approve_company(cid: str, body: VerificationDecision, admin: dict = Depends(require_perm("approve_recruiters"))):
    company = await db.users.find_one({"id": cid, "role": "company"})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if body.status not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.users.update_one({"id": cid}, {"$set": {
        "approval_status": body.status, "approval_remarks": body.remarks,
        "verified": body.status == "approved"}})
    await notify(cid, "approval", f"Recruiter account {body.status}",
                 f"Your recruiter account was {body.status} by the placement cell." + (f" Remark: {body.remarks}" if body.remarks else ""))
    await audit(admin, f"recruiter_{body.status}", cid, company.get("company_name"), body.remarks)
    return {"message": "updated"}


# ------------------------------------------------------------------ admin: users & filters
@api.get("/admin/students")
async def admin_students(
    admin: dict = Depends(require_perm("manage_students")),
    verification: Optional[str] = None, frozen: Optional[bool] = None, placed: Optional[bool] = None,
    applied: Optional[bool] = None, department: Optional[str] = None, section: Optional[str] = None,
    year: Optional[int] = None, cgpa_min: Optional[float] = None, cgpa_max: Optional[float] = None,
    resume_uploaded: Optional[bool] = None, missing_documents: Optional[bool] = None,
    email_domain: Optional[str] = None, search: Optional[str] = None,
):
    q: Dict[str, Any] = {"role": "student"}
    if verification:
        q["verification_status"] = verification
    if frozen is not None:
        q["frozen"] = frozen
    if placed is not None:
        q["placed"] = placed
    if department:
        q["department"] = department
    if section:
        q["section"] = section
    if year:
        q["graduation_year"] = year
    if cgpa_min is not None or cgpa_max is not None:
        q["cgpa"] = {}
        if cgpa_min is not None:
            q["cgpa"]["$gte"] = cgpa_min
        if cgpa_max is not None:
            q["cgpa"]["$lte"] = cgpa_max
    if resume_uploaded is True:
        q["documents.resume"] = {"$exists": True}
    if email_domain:
        q["email"] = {"$regex": f"{email_domain}$", "$options": "i"}
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}}]

    students = await db.users.find(q).sort("created_at", -1).to_list(3000)
    result = []
    for s in students:
        pu = public_user(s)
        pu["applications_count"] = await db.applications.count_documents({"student_id": s["id"]})
        pu["profile_completion"] = profile_completion(s)
        docs = s.get("documents", {}) or {}
        pu["missing_docs"] = [d for d in MANDATORY_DOCS if not docs.get(d)]
        result.append(pu)

    if applied is not None:
        result = [r for r in result if (r["applications_count"] > 0) == applied]
    if missing_documents is True:
        result = [r for r in result if r["missing_docs"]]
    return result


@api.get("/admin/companies")
async def admin_companies(admin: dict = Depends(require_perm("manage_students")), approval: Optional[str] = None):
    q = {"role": "company"}
    if approval:
        q["approval_status"] = approval
    companies = await db.users.find(q).sort("created_at", -1).to_list(2000)
    result = []
    for c in companies:
        pu = public_user(c)
        pu["jobs_count"] = await db.jobs.count_documents({"company_id": c["id"]})
        result.append(pu)
    return result


@api.get("/admin/users")
async def admin_users(role: Optional[str] = None, admin: dict = Depends(require_perm("manage_students"))):
    q = {}
    if role:
        q["role"] = role
    users = await db.users.find(q).sort("created_at", -1).to_list(3000)
    out = []
    for u in users:
        pu = public_user(u)
        if u["role"] == "student":
            pu["applications_count"] = await db.applications.count_documents({"student_id": u["id"]})
        if u["role"] == "company":
            pu["jobs_count"] = await db.jobs.count_documents({"company_id": u["id"]})
        out.append(pu)
    return out


@api.get("/admin/students/{sid}")
async def admin_student_detail(sid: str, admin: dict = Depends(require_perm("manage_students"))):
    s = await db.users.find_one({"id": sid, "role": "student"})
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    pu = public_user(s)
    pu["profile_completion"] = profile_completion(s)
    pu["applications"] = [await enrich_application(a) for a in
                          await db.applications.find({"student_id": sid}).to_list(500)]
    return pu


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_perm("delete_users"))):
    target = await db.users.find_one({"id": user_id})
    if not target or target["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete this user.")
    await db.users.delete_one({"id": user_id})
    await db.jobs.delete_many({"company_id": user_id})
    await db.applications.delete_many({"$or": [{"student_id": user_id}, {"company_id": user_id}]})
    await audit(admin, "user_deleted", user_id, target.get("name"))
    return {"message": "deleted"}


# ------------------------------------------------------------------ staff (RBAC)
@api.post("/admin/staff")
async def create_staff(body: StaffInput, admin: dict = Depends(require_perm("manage_staff"))):
    if body.admin_role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Invalid admin role")
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already in use")
    doc = {"id": str(uuid.uuid4()), "name": body.name, "email": email,
           "password_hash": hash_password(body.password), "role": "admin",
           "admin_role": body.admin_role, "created_at": now_iso(), "profile_complete": True}
    await db.users.insert_one(doc)
    await audit(admin, "staff_created", doc["id"], body.name, body.admin_role)
    return public_user(doc)


@api.get("/admin/staff")
async def list_staff(admin: dict = Depends(require_perm("manage_staff"))):
    staff = await db.users.find({"role": "admin"}).to_list(200)
    return [public_user(s) for s in staff]


# ------------------------------------------------------------------ audit
@api.get("/admin/audit")
async def get_audit(admin: dict = Depends(require_perm("view_audit"))):
    logs = await db.audit_logs.find().sort("created_at", -1).to_list(500)
    for l in logs:
        l.pop("_id", None)
    return logs


# ------------------------------------------------------------------ admin dashboard
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_perm("view_dashboard"))):
    total_students = await db.users.count_documents({"role": "student"})
    total_companies = await db.users.count_documents({"role": "company"})
    total_jobs = await db.jobs.count_documents({})
    total_apps = await db.applications.count_documents({})
    placed = await db.users.count_documents({"role": "student", "placed": True})
    placement_rate = round((placed / total_students * 100), 1) if total_students else 0

    awaiting_verification = await db.users.count_documents({"role": "student", "verification_status": "pending"})
    awaiting_recruiter = await db.users.count_documents({"role": "company", "approval_status": "pending"})

    # pending documents count
    pending_docs = 0
    students = await db.users.find({"role": "student"}).to_list(3000)
    packages = []
    dept_map: Dict[str, Dict[str, int]] = {}
    branch_map: Dict[str, Dict[str, int]] = {}
    for s in students:
        for d in (s.get("documents") or {}).values():
            if d.get("status") == "pending":
                pending_docs += 1
        if s.get("placed") and s.get("placed_package"):
            packages.append(s["placed_package"])
        dept = s.get("department") or s.get("branch") or "Unassigned"
        dept_map.setdefault(dept, {"total": 0, "placed": 0})
        dept_map[dept]["total"] += 1
        if s.get("placed"):
            dept_map[dept]["placed"] += 1
        br = s.get("branch") or "Unassigned"
        branch_map.setdefault(br, {"total": 0, "placed": 0})
        branch_map[br]["total"] += 1
        if s.get("placed"):
            branch_map[br]["placed"] += 1

    highest_package = max(packages) if packages else 0
    avg_package = round(sum(packages) / len(packages), 2) if packages else 0

    status_dist = [{"status": s, "count": await db.applications.count_documents({"status": s})}
                   for s in APPLICATION_STATUSES]

    pipeline = [{"$group": {"_id": "$company_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}, {"$limit": 6}]
    top = await db.applications.aggregate(pipeline).to_list(6)
    top_companies = []
    for t in top:
        c = await db.users.find_one({"id": t["_id"]})
        if c:
            top_companies.append({"name": c.get("company_name") or c.get("name"), "applications": t["count"]})

    trend = []
    now = now_utc()
    cursor = now.replace(day=1)
    months = []
    for _ in range(6):
        months.append(cursor)
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    for m in reversed(months):
        nm = (m + timedelta(days=32)).replace(day=1)
        cnt = await db.applications.count_documents({"created_at": {"$gte": m.isoformat(), "$lt": nm.isoformat()}})
        pl = await db.applications.count_documents({"status": "selected", "created_at": {"$gte": m.isoformat(), "$lt": nm.isoformat()}})
        trend.append({"month": m.strftime("%b"), "applications": cnt, "placed": pl})

    return {
        "total_students": total_students, "total_companies": total_companies,
        "total_jobs": total_jobs, "total_applications": total_apps,
        "placed": placed, "placement_rate": placement_rate,
        "awaiting_verification": awaiting_verification, "awaiting_recruiter_approval": awaiting_recruiter,
        "pending_documents": pending_docs, "highest_package": highest_package, "avg_package": avg_package,
        "active_drives": await db.drives.count_documents({"moderation": "approved", "status": {"$nin": ["completed", "cancelled"]}}),
        "pending_interviews": await db.interviews.count_documents({"status": {"$in": ["scheduled", "rescheduled"]}}),
        "todays_events": await db.events.count_documents({"date": now_utc().date().isoformat()}),
        "status_distribution": status_dist, "top_companies": top_companies, "trend": trend,
        "dept_wise": [{"name": k, **v} for k, v in dept_map.items()],
        "branch_wise": [{"name": k, **v} for k, v in branch_map.items()],
    }


# ------------------------------------------------------------------ AI (Claude)
async def call_claude(system: str, prompt: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                   system_message=system).with_model("anthropic", "claude-sonnet-4-6")
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp if isinstance(resp, str) else str(resp)


def parse_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


@api.post("/student/ai-review")
async def ai_review(user: dict = Depends(require_roles("student"))):
    full = await db.users.find_one({"id": user["id"]})
    docs = full.get("documents", {}) or {}
    profile = {
        "name": full.get("name"), "branch": full.get("branch"), "degree": full.get("degree"),
        "cgpa": full.get("cgpa"), "skills": full.get("skills"), "projects": full.get("projects"),
        "certificates": full.get("certificates"), "bio": full.get("bio"),
        "has_resume": bool(docs.get("resume")), "linkedin": bool(full.get("linkedin")),
        "github": bool(full.get("github")),
    }
    system = ("You are an expert placement mentor. Analyze the student's profile and return ONLY valid JSON "
              "with keys: overall (0-100 int), resume (0-100), skills (0-100), projects (0-100), "
              "certificates (0-100), strength_label (one of Weak, Average, Good, Strong, Excellent), "
              "suggestions (array of 3-5 short actionable strings).")
    prompt = f"Student profile JSON:\n{json.dumps(profile)}\nReturn the analysis JSON only."
    try:
        raw = await call_claude(system, prompt)
        data = parse_json(raw)
    except Exception as e:
        logger.error(f"AI review failed: {e}")
        raise HTTPException(status_code=502, detail="AI review is temporarily unavailable. Please try again.")
    data["generated_at"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile_score": data}})
    return data


@api.get("/student/recommendations")
async def ai_recommendations(user: dict = Depends(require_roles("student"))):
    full = await db.users.find_one({"id": user["id"]})
    jobs = await db.jobs.find({"status": "active"}).to_list(200)
    eligible = []
    for j in jobs:
        if eligibility_check(full, j)["eligible"]:
            eligible.append(j)
    if not eligible:
        return {"recommendations": []}
    job_summ = [{"id": j["id"], "title": j["title"], "skills": j.get("skills", []),
                 "role_type": j.get("role_type"), "ctc_max": j.get("ctc_max")} for j in eligible[:25]]
    profile = {"branch": full.get("branch"), "cgpa": full.get("cgpa"),
               "skills": full.get("skills"), "projects": full.get("projects")}
    system = ("You are a placement recommendation engine. Given a student profile and a list of eligible jobs, "
              "rank the best matches. Return ONLY valid JSON: {\"recommendations\": [{\"job_id\": str, "
              "\"match_score\": int 0-100, \"reason\": short string}]} with at most 6 items, best first.")
    prompt = f"Student:\n{json.dumps(profile)}\nJobs:\n{json.dumps(job_summ)}\nReturn JSON only."
    try:
        raw = await call_claude(system, prompt)
        data = parse_json(raw)
        recs = data.get("recommendations", [])
    except Exception as e:
        logger.error(f"AI reco failed: {e}")
        recs = [{"job_id": j["id"], "match_score": 70, "reason": "Matches your eligibility."} for j in eligible[:6]]
    by_id = {j["id"]: j for j in eligible}
    out = []
    for r in recs:
        j = by_id.get(r.get("job_id"))
        if j:
            ej = await enrich_job(j)
            ej["match_score"] = r.get("match_score", 70)
            ej["match_reason"] = r.get("reason", "")
            out.append(ej)
    return {"recommendations": out}


# ------------------------------------------------------------------ Password Reset (OTP) + EmailService abstraction
class EmailService:
    async def send(self, to: str, subject: str, body: str):
        raise NotImplementedError


class NotificationEmailService(EmailService):
    """Abstract email provider. Currently logs; swap with SendGrid/Resend later."""
    async def send(self, to: str, subject: str, body: str):
        logger.info(f"[EMAIL -> {to}] {subject} | {body}")


email_service = NotificationEmailService()


async def security_log(event: str, email: Optional[str] = None, ip: Optional[str] = None, detail: Optional[str] = None):
    await db.security_logs.insert_one({
        "id": str(uuid.uuid4()), "event": event, "email": email, "ip": ip,
        "detail": detail, "created_at": now_iso()})


def validate_password_strength(pw: str) -> Optional[str]:
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", pw):
        return "Password must contain an uppercase letter."
    if not re.search(r"[a-z]", pw):
        return "Password must contain a lowercase letter."
    if not re.search(r"\d", pw):
        return "Password must contain a number."
    if not re.search(r"[^A-Za-z0-9]", pw):
        return "Password must contain a special character."
    return None


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class VerifyOtpInput(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordInput(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordInput, request: Request):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else None
    # rate limit: max 3 requests / 15 min per email
    window = (now_utc() - timedelta(minutes=15)).isoformat()
    recent = await db.password_reset_otps.count_documents({"email": email, "created_at": {"$gte": window}})
    if recent >= 3:
        await security_log("otp_rate_limited", email, ip)
        raise HTTPException(status_code=429, detail="Too many reset requests. Please try again in a few minutes.")

    user = await db.users.find_one({"email": email})
    resp = {"message": "If an account exists for this email, an OTP has been sent."}
    if not user:
        await security_log("otp_request_unknown_email", email, ip)
        return resp

    # invalidate previous tokens
    await db.password_reset_otps.update_many({"email": email, "used": False}, {"$set": {"used": True}})
    otp = f"{secrets.randbelow(1000000):06d}"
    await db.password_reset_otps.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "email": email,
        "otp_hash": hash_password(otp), "expires_at": (now_utc() + timedelta(minutes=10)).isoformat(),
        "attempts": 0, "used": False, "created_at": now_iso()})
    await email_service.send(email, "Your PlacementHub password reset OTP",
                             f"Your OTP is {otp}. It expires in 10 minutes.")
    await notify(user["id"], "security", "Password reset requested",
                 "A password reset OTP was generated for your account. If this wasn't you, ignore this message.")
    await security_log("otp_generated", email, ip)
    # dev delivery (no email provider configured yet)
    resp["dev_otp"] = otp
    return resp


@api.post("/auth/verify-otp")
async def verify_otp(body: VerifyOtpInput, request: Request):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else None
    rec = await db.password_reset_otps.find_one({"email": email, "used": False}, sort=[("created_at", -1)])
    if not rec:
        raise HTTPException(status_code=400, detail="No active OTP. Please request a new one.")
    if now_utc() > datetime.fromisoformat(rec["expires_at"]):
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if rec["attempts"] >= 5:
        await db.password_reset_otps.update_one({"id": rec["id"]}, {"$set": {"used": True}})
        await security_log("otp_max_attempts", email, ip)
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Please request a new OTP.")
    if not verify_password(body.otp, rec["otp_hash"]):
        await db.password_reset_otps.update_one({"id": rec["id"]}, {"$inc": {"attempts": 1}})
        await security_log("otp_wrong", email, ip)
        raise HTTPException(status_code=400, detail=f"Incorrect OTP. {4 - rec['attempts']} attempts left.")
    # success -> issue short-lived reset token bound to this otp record
    token = jwt.encode({"sub": rec["user_id"], "otp_id": rec["id"], "type": "reset",
                        "exp": now_utc() + timedelta(minutes=10)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    await security_log("otp_verified", email, ip)
    return {"reset_token": token}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordInput, request: Request):
    ip = request.client.host if request.client else None
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    err = validate_password_strength(body.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    try:
        payload = jwt.decode(body.reset_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Invalid reset token.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset session expired. Start again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid reset token.")
    rec = await db.password_reset_otps.find_one({"id": payload.get("otp_id")})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="This reset link has already been used.")
    await db.users.update_one({"id": payload["sub"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.password_reset_otps.update_one({"id": rec["id"]}, {"$set": {"used": True}})
    await db.password_reset_otps.update_many({"email": rec["email"], "used": False}, {"$set": {"used": True}})
    await notify(payload["sub"], "security", "Password changed", "Your password was reset successfully.")
    await security_log("password_reset", rec["email"], ip)
    return {"message": "Password reset successful. You can now log in."}


# ------------------------------------------------------------------ Campus Drives
DRIVE_TYPES = ["Internship", "Full-Time", "PPO", "Hackathon", "Walk-In"]
DRIVE_STATUSES = ["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"]
PIPELINE_STAGES = ["registered", "eligible", "shortlisted", "round_1", "round_2", "hr", "offer", "accepted", "placed"]


class DriveInput(BaseModel):
    title: str
    role: str
    package_min: Optional[float] = None
    package_max: Optional[float] = None
    location: str = "Remote"
    description: str = ""
    drive_type: str = "Full-Time"
    eligibility_cgpa: Optional[float] = None
    max_backlogs: Optional[int] = None
    branches: List[str] = []
    departments: List[str] = []
    passing_year: Optional[int] = None
    gender: Optional[str] = "Any"
    degree: Optional[str] = None
    registration_deadline: Optional[str] = None
    drive_date: Optional[str] = None
    max_applicants: Optional[int] = None
    rounds: List[str] = ["Aptitude", "Technical", "HR"]
    status: str = "registration_open"


async def enrich_drive(d: dict) -> dict:
    d = dict(d)
    d.pop("_id", None)
    company = await db.users.find_one({"id": d.get("company_id")})
    if company:
        d["company_name"] = company.get("company_name") or company.get("name")
    d["registrations_count"] = await db.drive_registrations.count_documents({"drive_id": d["id"], "withdrawn": False})
    return d


@api.post("/drives")
async def create_drive(body: DriveInput, user: dict = Depends(require_roles("company", "admin"))):
    if user["role"] == "company":
        full = await db.users.find_one({"id": user["id"]})
        if full.get("approval_status") != "approved":
            raise HTTPException(status_code=403, detail="Your recruiter account is pending approval.")
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "company_id": user["id"],
                "moderation": "approved" if user["role"] == "admin" else "pending",
                "created_at": now_iso()})
    await db.drives.insert_one(doc)
    await notify_admins("drive", "New campus drive submitted",
                        f"{body.title} needs review.", "/app/drives")
    return await enrich_drive(doc)


@api.get("/drives")
async def list_drives(request: Request, mine: bool = False, drive_type: Optional[str] = None):
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        pass
    q = {}
    if mine and user and user["role"] == "company":
        q["company_id"] = user["id"]
    elif user and user["role"] == "admin":
        pass
    else:
        q["moderation"] = "approved"
        q["status"] = {"$nin": ["cancelled"]}
    if drive_type and drive_type != "all":
        q["drive_type"] = drive_type
    drives = await db.drives.find(q).sort("created_at", -1).to_list(500)
    out = [await enrich_drive(d) for d in drives]
    if user and user["role"] == "student":
        regs = await db.drive_registrations.find({"student_id": user["id"], "withdrawn": False}).to_list(500)
        reg_ids = {r["drive_id"] for r in regs}
        for d in out:
            d["registered"] = d["id"] in reg_ids
    return out


@api.get("/drives/{drive_id}")
async def get_drive(drive_id: str):
    d = await db.drives.find_one({"id": drive_id})
    if not d:
        raise HTTPException(status_code=404, detail="Drive not found")
    return await enrich_drive(d)


@api.patch("/drives/{drive_id}/moderation")
async def moderate_drive(drive_id: str, body: StatusUpdate, admin: dict = Depends(require_perm("moderate_jobs"))):
    if body.status not in {"approved", "rejected", "archived"}:
        raise HTTPException(status_code=400, detail="Invalid moderation status")
    d = await db.drives.find_one({"id": drive_id})
    if not d:
        raise HTTPException(status_code=404, detail="Drive not found")
    await db.drives.update_one({"id": drive_id}, {"$set": {"moderation": body.status}})
    await notify(d["company_id"], "drive", f"Drive {body.status}", f"Your drive '{d['title']}' was {body.status}.", "/app/drives")
    await audit(admin, f"drive_{body.status}", d["company_id"], d["title"])
    return {"message": "updated"}


@api.patch("/drives/{drive_id}/status")
async def set_drive_status(drive_id: str, body: StatusUpdate, user: dict = Depends(require_roles("company", "admin"))):
    d = await db.drives.find_one({"id": drive_id})
    if not d:
        raise HTTPException(status_code=404, detail="Drive not found")
    if user["role"] != "admin" and d["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your drive.")
    if body.status not in DRIVE_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.drives.update_one({"id": drive_id}, {"$set": {"status": body.status}})
    return {"message": "updated"}


@api.post("/drives/{drive_id}/register")
async def register_drive(drive_id: str, user: dict = Depends(require_roles("student"))):
    d = await db.drives.find_one({"id": drive_id})
    if not d or d.get("moderation") != "approved":
        raise HTTPException(status_code=404, detail="Drive not available")
    if d.get("status") not in {"registration_open", "upcoming"}:
        raise HTTPException(status_code=400, detail="Registrations are closed for this drive.")
    full = await db.users.find_one({"id": user["id"]})
    if full.get("verification_status") != "approved":
        raise HTTPException(status_code=403, detail="Your profile must be verified to register.")
    if full.get("frozen") and full.get("freeze_reason") != "Already Placed":
        raise HTTPException(status_code=403, detail=f"Account frozen ({full.get('freeze_reason')}).")
    elig = eligibility_check(full, d)
    if not elig["eligible"]:
        raise HTTPException(status_code=403, detail="Not eligible: " + "; ".join(elig["reasons"]))
    if d.get("registration_deadline"):
        try:
            if now_utc() > datetime.fromisoformat(d["registration_deadline"]):
                raise HTTPException(status_code=400, detail="Registration deadline has passed.")
        except (ValueError, TypeError):
            pass
    if d.get("max_applicants"):
        cnt = await db.drive_registrations.count_documents({"drive_id": drive_id, "withdrawn": False})
        if cnt >= d["max_applicants"]:
            raise HTTPException(status_code=400, detail="This drive is full.")
    if await db.drive_registrations.find_one({"drive_id": drive_id, "student_id": user["id"], "withdrawn": False}):
        raise HTTPException(status_code=400, detail="Already registered for this drive.")
    ts = now_iso()
    reg = {"id": str(uuid.uuid4()), "drive_id": drive_id, "company_id": d["company_id"],
           "student_id": user["id"], "stage": "registered", "withdrawn": False, "created_at": ts,
           "timeline": [{"stage": "registered", "at": ts}]}
    await db.drive_registrations.insert_one(reg)
    await notify(d["company_id"], "drive", "New drive registration", f"{full['name']} registered for {d['title']}.", "/app/drives")
    reg.pop("_id", None)
    return reg


@api.delete("/drives/{drive_id}/register")
async def withdraw_drive(drive_id: str, user: dict = Depends(require_roles("student"))):
    r = await db.drive_registrations.find_one({"drive_id": drive_id, "student_id": user["id"], "withdrawn": False})
    if not r:
        raise HTTPException(status_code=404, detail="Not registered")
    await db.drive_registrations.update_one({"id": r["id"]}, {"$set": {"withdrawn": True}})
    return {"message": "withdrawn"}


@api.get("/drives/me/registered")
async def my_drives(user: dict = Depends(require_roles("student"))):
    regs = await db.drive_registrations.find({"student_id": user["id"], "withdrawn": False}).sort("created_at", -1).to_list(200)
    out = []
    for r in regs:
        r.pop("_id", None)
        d = await db.drives.find_one({"id": r["drive_id"]})
        if d:
            r["drive"] = await enrich_drive(d)
        out.append(r)
    return out


@api.get("/drives/{drive_id}/registrations")
async def drive_registrations(drive_id: str, user: dict = Depends(require_roles("company", "admin"))):
    d = await db.drives.find_one({"id": drive_id})
    if not d:
        raise HTTPException(status_code=404, detail="Drive not found")
    if user["role"] != "admin" and d["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your drive.")
    regs = await db.drive_registrations.find({"drive_id": drive_id, "withdrawn": False}).to_list(1000)
    out = []
    for r in regs:
        r.pop("_id", None)
        s = await db.users.find_one({"id": r["student_id"]})
        if s:
            r["student"] = public_user(s)
        out.append(r)
    return out


@api.patch("/registrations/{reg_id}/stage")
async def advance_stage(reg_id: str, body: StatusUpdate, user: dict = Depends(require_roles("company", "admin"))):
    if body.status not in PIPELINE_STAGES:
        raise HTTPException(status_code=400, detail="Invalid stage")
    r = await db.drive_registrations.find_one({"id": reg_id})
    if not r:
        raise HTTPException(status_code=404, detail="Registration not found")
    if user["role"] != "admin" and r["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your candidate.")
    await db.drive_registrations.update_one(
        {"id": reg_id}, {"$set": {"stage": body.status},
                         "$push": {"timeline": {"stage": body.status, "at": now_iso()}}})
    d = await db.drives.find_one({"id": r["drive_id"]})
    await notify(r["student_id"], "drive", "Drive progress update",
                 f"You advanced to '{body.status.replace('_', ' ')}' in {d['title'] if d else 'a drive'}.", "/app/drives")
    if body.status == "placed":
        s = await db.users.find_one({"id": r["student_id"]})
        if s and not s.get("placed"):
            await db.users.update_one({"id": r["student_id"]}, {"$set": {
                "placed": True, "placed_company": (d or {}).get("company_name"),
                "placed_package": (d or {}).get("package_max"), "frozen": True, "freeze_reason": "Already Placed"}})
    return {"message": "updated"}


# ------------------------------------------------------------------ Interviews
INTERVIEW_MODES = ["Online", "Offline", "Phone"]
ROUND_TYPES = ["Group Discussion", "Technical Round", "HR Round", "Managerial Round"]
INTERVIEW_STATUSES = ["scheduled", "rescheduled", "cancelled", "completed", "no_show"]


class InterviewInput(BaseModel):
    student_id: str
    drive_id: Optional[str] = None
    round_type: str = "Technical Round"
    round_number: int = 1
    mode: str = "Online"
    date: str
    time: str
    duration: str = "30 mins"
    venue: Optional[str] = None
    meeting_link: Optional[str] = None
    instructions: Optional[str] = None
    interviewer_name: Optional[str] = None


class InterviewUpdate(BaseModel):
    status: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    mode: Optional[str] = None
    venue: Optional[str] = None
    meeting_link: Optional[str] = None
    instructions: Optional[str] = None


class InterviewResponse(BaseModel):
    response: str  # accepted / reschedule_requested


class FeedbackInput(BaseModel):
    communication: int
    technical_skills: int
    problem_solving: int
    confidence: int
    overall_rating: int
    recommendation: str
    comments: Optional[str] = None
    status: str  # pass / fail / hold


async def enrich_interview(iv: dict, include_student=False) -> dict:
    iv = dict(iv)
    iv.pop("_id", None)
    company = await db.users.find_one({"id": iv.get("company_id")})
    if company:
        iv["company_name"] = company.get("company_name") or company.get("name")
    if iv.get("drive_id"):
        d = await db.drives.find_one({"id": iv["drive_id"]})
        iv["drive_title"] = d.get("title") if d else None
    if include_student:
        s = await db.users.find_one({"id": iv["student_id"]})
        if s:
            iv["student"] = public_user(s)
    iv["feedback"] = None
    fb = await db.interview_feedback.find_one({"interview_id": iv["id"]})
    if fb:
        fb.pop("_id", None)
        iv["feedback"] = fb
    return iv


@api.post("/interviews")
async def create_interview(body: InterviewInput, user: dict = Depends(require_roles("company", "admin"))):
    student = await db.users.find_one({"id": body.student_id, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "company_id": user["id"], "status": "scheduled",
                "student_response": "pending", "created_at": now_iso()})
    await db.interviews.insert_one(doc)
    await notify(body.student_id, "interview", "Interview scheduled",
                 f"{body.round_type} on {body.date} at {body.time} ({body.mode}).", "/app/interviews")
    return await enrich_interview(doc, include_student=True)


@api.get("/interviews/me")
async def my_interviews(user: dict = Depends(require_roles("student"))):
    ivs = await db.interviews.find({"student_id": user["id"]}).sort("date", 1).to_list(500)
    return [await enrich_interview(i) for i in ivs]


@api.get("/interviews/company")
async def company_interviews(user: dict = Depends(require_roles("company", "admin"))):
    q = {} if user["role"] == "admin" else {"company_id": user["id"]}
    ivs = await db.interviews.find(q).sort("date", 1).to_list(1000)
    return [await enrich_interview(i, include_student=True) for i in ivs]


@api.patch("/interviews/{iv_id}/respond")
async def respond_interview(iv_id: str, body: InterviewResponse, user: dict = Depends(require_roles("student"))):
    iv = await db.interviews.find_one({"id": iv_id, "student_id": user["id"]})
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
    if body.response not in {"accepted", "reschedule_requested"}:
        raise HTTPException(status_code=400, detail="Invalid response")
    await db.interviews.update_one({"id": iv_id}, {"$set": {"student_response": body.response}})
    await notify(iv["company_id"], "interview", "Interview response",
                 f"A candidate {body.response.replace('_', ' ')} for {iv['round_type']}.", "/app/interviews")
    return {"message": "updated"}


@api.patch("/interviews/{iv_id}")
async def update_interview(iv_id: str, body: InterviewUpdate, user: dict = Depends(require_roles("company", "admin"))):
    iv = await db.interviews.find_one({"id": iv_id})
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
    if user["role"] != "admin" and iv["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your interview.")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if body.status and body.status not in INTERVIEW_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if updates:
        await db.interviews.update_one({"id": iv_id}, {"$set": updates})
    label = updates.get("status", "updated")
    await notify(iv["student_id"], "interview", "Interview updated",
                 f"Your {iv['round_type']} interview was {label.replace('_', ' ')}.", "/app/interviews")
    fresh = await db.interviews.find_one({"id": iv_id})
    return await enrich_interview(fresh, include_student=True)


@api.post("/interviews/{iv_id}/feedback")
async def submit_feedback(iv_id: str, body: FeedbackInput, user: dict = Depends(require_roles("company", "admin"))):
    iv = await db.interviews.find_one({"id": iv_id})
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
    if user["role"] != "admin" and iv["company_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your interview.")
    if body.status not in {"pass", "fail", "hold"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "interview_id": iv_id, "student_id": iv["student_id"],
                "company_id": iv["company_id"], "created_at": now_iso()})
    await db.interview_feedback.replace_one({"interview_id": iv_id}, doc, upsert=True)
    await db.interviews.update_one({"id": iv_id}, {"$set": {"status": "completed"}})
    await notify(iv["student_id"], "interview", "Interview feedback recorded",
                 f"Feedback for your {iv['round_type']} is in. Result: {body.status}.", "/app/interviews")
    doc.pop("_id", None)
    return doc


# ------------------------------------------------------------------ Events & Calendar
class EventInput(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    type: str = "event"


@api.post("/events")
async def create_event(body: EventInput, admin: dict = Depends(require_perm("view_dashboard"))):
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_by": admin["name"], "created_at": now_iso()})
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/events")
async def list_events(user: dict = Depends(get_current_user)):
    ev = await db.events.find().sort("date", 1).to_list(500)
    for e in ev:
        e.pop("_id", None)
    return ev


@api.get("/calendar")
async def calendar(user: dict = Depends(get_current_user)):
    items = []
    ev = await db.events.find().to_list(500)
    for e in ev:
        if e.get("date"):
            items.append({"type": "event", "title": e["title"], "date": e["date"], "meta": e.get("type")})

    if user["role"] == "student":
        ivs = await db.interviews.find({"student_id": user["id"]}).to_list(500)
        for i in ivs:
            items.append({"type": "interview", "title": f"{i['round_type']} — {i.get('mode')}", "date": i.get("date"), "meta": i.get("time")})
        regs = await db.drive_registrations.find({"student_id": user["id"], "withdrawn": False}).to_list(500)
        for r in regs:
            d = await db.drives.find_one({"id": r["drive_id"]})
            if d and d.get("drive_date"):
                items.append({"type": "drive", "title": d["title"], "date": d["drive_date"], "meta": "Drive"})
    elif user["role"] == "company":
        ivs = await db.interviews.find({"company_id": user["id"]}).to_list(1000)
        for i in ivs:
            items.append({"type": "interview", "title": f"{i['round_type']}", "date": i.get("date"), "meta": i.get("time")})
        drives = await db.drives.find({"company_id": user["id"]}).to_list(500)
        for d in drives:
            if d.get("drive_date"):
                items.append({"type": "drive", "title": d["title"], "date": d["drive_date"], "meta": "Drive"})
            if d.get("registration_deadline"):
                items.append({"type": "deadline", "title": f"{d['title']} deadline", "date": d["registration_deadline"], "meta": "Deadline"})
    else:
        drives = await db.drives.find({}).to_list(500)
        for d in drives:
            if d.get("drive_date"):
                items.append({"type": "drive", "title": d["title"], "date": d["drive_date"], "meta": "Drive"})
        ivs = await db.interviews.find({}).to_list(1000)
        for i in ivs:
            items.append({"type": "interview", "title": i["round_type"], "date": i.get("date"), "meta": i.get("time")})
    items = [i for i in items if i.get("date")]
    return items


# ------------------------------------------------------------------ Reminders
@api.get("/reminders")
async def reminders(user: dict = Depends(get_current_user)):
    out = []
    today = now_utc().date()
    horizon = today + timedelta(days=7)

    def within(dstr):
        try:
            d = datetime.fromisoformat(dstr).date() if "T" in str(dstr) else datetime.strptime(str(dstr)[:10], "%Y-%m-%d").date()
            return today <= d <= horizon, d
        except Exception:
            return False, None

    if user["role"] == "student":
        full = await db.users.find_one({"id": user["id"]})
        if full.get("verification_status") == "pending":
            out.append({"type": "verification", "title": "Verification pending", "detail": "Complete your profile & documents to get verified.", "date": None})
        ivs = await db.interviews.find({"student_id": user["id"], "status": {"$in": ["scheduled", "rescheduled"]}}).to_list(200)
        for i in ivs:
            ok, d = within(i.get("date"))
            if ok:
                out.append({"type": "interview", "title": f"{i['round_type']} interview", "detail": f"{i.get('date')} at {i.get('time')} ({i.get('mode')})", "date": i.get("date")})
        drives = await db.drives.find({"moderation": "approved", "status": "registration_open"}).to_list(200)
        for d in drives:
            ok, dt = within(d.get("registration_deadline"))
            if ok:
                out.append({"type": "deadline", "title": f"{d['title']} registration closes", "detail": f"Deadline {d.get('registration_deadline')}", "date": d.get("registration_deadline")})
        offers = await db.offers.find({"student_id": user["id"], "status": "offered"}).to_list(100)
        for o in offers:
            out.append({"type": "offer", "title": "Offer awaiting response", "detail": f"{o.get('role')} — respond soon", "date": None})
    elif user["role"] == "company":
        ivs = await db.interviews.find({"company_id": user["id"], "status": {"$in": ["scheduled", "rescheduled"]}}).to_list(500)
        for i in ivs:
            ok, d = within(i.get("date"))
            if ok:
                out.append({"type": "interview", "title": f"Upcoming interview", "detail": f"{i.get('date')} at {i.get('time')}", "date": i.get("date")})
    return out



async def build_chat_context(user: dict) -> str:
    role = user["role"]
    if role == "student":
        full = await db.users.find_one({"id": user["id"]})
        apps = await db.applications.count_documents({"student_id": user["id"]})
        comp = profile_completion(full)
        ctx = (
            f"You are PlacementHub AI, a friendly, concise career & placement assistant for a STUDENT named {full.get('name')}. "
            "Help with resume tips, interview preparation, eligibility questions, skill-building advice, and general career guidance. "
            "When relevant, use the student's context below to give personalised answers. Keep answers practical and encouraging. "
            "Use short paragraphs and bullet points where helpful.\n\n"
            "STUDENT CONTEXT:\n"
            f"- Branch: {full.get('branch')} | Department: {full.get('department')} | Degree: {full.get('degree')}\n"
            f"- CGPA: {full.get('cgpa')} | Backlogs: {full.get('backlogs')} | Passing year: {full.get('graduation_year')}\n"
            f"- Skills: {', '.join(full.get('skills') or []) or 'none listed'}\n"
            f"- Projects: {', '.join(full.get('projects') or []) or 'none listed'}\n"
            f"- Verification: {full.get('verification_status')} | Profile completion: {comp['percentage']}% "
            f"(missing: {', '.join(comp['missing']) or 'nothing'})\n"
            f"- Applications submitted: {apps} | Placed: {full.get('placed')}\n"
        )
        return ctx
    if role == "company":
        full = await db.users.find_one({"id": user["id"]})
        return (
            f"You are PlacementHub AI, a concise assistant for a RECRUITER at {full.get('company_name') or full.get('name')}. "
            "Help write compelling job descriptions, define screening/eligibility criteria, plan hiring drives, and share campus-hiring best practices. "
            "Be practical and professional."
        )
    return (
        "You are PlacementHub AI, an assistant for a college PLACEMENT CELL ADMIN. "
        "Help with placement operations, interpreting analytics, drafting policies, communication templates, and improving placement outcomes. "
        "Be practical and professional."
    )


@api.get("/chat/history")
async def chat_history(user: dict = Depends(get_current_user)):
    msgs = await db.chat_messages.find({"user_id": user["id"]}).sort("created_at", 1).to_list(200)
    for m in msgs:
        m.pop("_id", None)
    return msgs


@api.delete("/chat/history")
async def clear_chat(user: dict = Depends(get_current_user)):
    await db.chat_messages.delete_many({"user_id": user["id"]})
    return {"message": "cleared"}


@api.post("/chat")
async def chat(body: ChatInput, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    text = body.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    ts = now_iso()
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "role": "user",
        "content": text, "created_at": ts})

    system = await build_chat_context(user)
    prior = await db.chat_messages.find({"user_id": user["id"]}).sort("created_at", 1).to_list(200)
    recent = prior[-12:]
    transcript = "\n".join(
        f"{'Student' if m['role'] == 'user' else 'Assistant'}: {m['content']}" for m in recent[:-1]
    )
    prompt = (f"Conversation so far:\n{transcript}\n\nUser: {text}\nAssistant:" if transcript else text)

    async def event_generator():
        full_text = ""
        try:
            llm = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"chat_{user['id']}",
                          system_message=system).with_model("anthropic", "claude-sonnet-5")
            async for ev in llm.stream_message(UserMessage(text=prompt)):
                if isinstance(ev, TextDelta):
                    full_text += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.error(f"Chat stream failed: {e}")
            if not full_text:
                full_text = "Sorry, I'm having trouble responding right now. Please try again in a moment."
                yield f"data: {json.dumps({'delta': full_text})}\n\n"
        await db.chat_messages.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "role": "assistant",
            "content": full_text, "created_at": now_iso()})
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})


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
    await db.notifications.create_index("user_id")
    await db.audit_logs.create_index("created_at")
    await db.password_reset_otps.create_index("email")
    await db.security_logs.create_index("created_at")
    await db.drives.create_index("company_id")
    await db.interviews.create_index("student_id")

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "Placement Cell Admin", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "admin", "admin_role": "super_admin",
            "created_at": now_iso(), "profile_complete": True})
    else:
        upd = {}
        if not verify_password(admin_password, existing["password_hash"]):
            upd["password_hash"] = hash_password(admin_password)
        if not existing.get("admin_role"):
            upd["admin_role"] = "super_admin"
        if upd:
            await db.users.update_one({"email": admin_email}, {"$set": upd})

    # staff demo accounts
    for email, name, arole in [
        ("officer@placementhub.com", "Placement Officer", "placement_officer"),
        ("coordinator@placementhub.com", "Dept Coordinator", "department_coordinator"),
    ]:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "name": name, "email": email,
                "password_hash": hash_password("Staff@123"), "role": "admin",
                "admin_role": arole, "created_at": now_iso(), "profile_complete": True})

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
            "approval_status": "approved", "approval_remarks": None,
            "created_at": now_iso(), "profile_complete": True})

    students = [
        {"name": "Aarav Sharma", "email": "aarav@student.com", "branch": "CSE", "cgpa": 8.7, "dept": "Computer Science"},
        {"name": "Diya Patel", "email": "diya@student.com", "branch": "IT", "cgpa": 9.1, "dept": "Information Technology"},
        {"name": "Kabir Singh", "email": "kabir@student.com", "branch": "ECE", "cgpa": 7.9, "dept": "Electronics"},
    ]
    student_ids = []
    for s in students:
        sid = str(uuid.uuid4())
        student_ids.append(sid)
        await db.users.insert_one({
            "id": sid, "name": s["name"], "email": s["email"],
            "password_hash": hash_password("Student@123"), "role": "student",
            "branch": s["branch"], "department": s["dept"], "cgpa": s["cgpa"], "degree": "B.Tech",
            "graduation_year": 2026, "phone": "9000000000", "backlogs": 0, "gender": "Any",
            "skills": ["Python", "React", "SQL"], "projects": ["Portfolio site"], "certificates": ["AWS CCP"],
            "documents": {
                "resume": {"url": "https://res.cloudinary.com/demo/raw/upload/sample.pdf", "public_id": "sample",
                           "resource_type": "raw", "format": "pdf", "status": "verified", "remarks": None, "uploaded_at": now_iso()},
                "marksheet_10": {"url": "https://res.cloudinary.com/demo/image/upload/sample.jpg", "public_id": "s10",
                                 "resource_type": "image", "format": "jpg", "status": "verified", "remarks": None, "uploaded_at": now_iso()},
                "marksheet_12": {"url": "https://res.cloudinary.com/demo/image/upload/sample.jpg", "public_id": "s12",
                                 "resource_type": "image", "format": "jpg", "status": "verified", "remarks": None, "uploaded_at": now_iso()},
            },
            "verification_status": "approved", "verification_remarks": "Looks good",
            "verification_date": now_iso(), "verified_by": "Placement Cell Admin",
            "frozen": False, "freeze_reason": None, "placed": False,
            "placed_company": None, "placed_package": None, "profile_score": None,
            "created_at": now_iso(), "profile_complete": True})

    jobs = [
        {"title": "Software Engineer", "role_type": "Full-time", "location": "Bengaluru",
         "ctc_min": 12, "ctc_max": 18, "skills": ["Java", "Spring", "AWS"], "branches": ["CSE", "IT"], "is_dream_company": True},
        {"title": "ML Engineer Intern", "role_type": "Internship", "location": "Remote",
         "ctc_min": 6, "ctc_max": 9, "skills": ["Python", "PyTorch", "NLP"], "branches": ["CSE", "IT", "ECE"], "is_dream_company": False},
        {"title": "Frontend Developer", "role_type": "Full-time", "location": "Pune",
         "ctc_min": 8, "ctc_max": 14, "skills": ["React", "TypeScript", "CSS"], "branches": ["CSE", "IT"], "is_dream_company": False},
        {"title": "Backend Developer", "role_type": "Full-time", "location": "Hyderabad",
         "ctc_min": 10, "ctc_max": 16, "skills": ["Node.js", "MongoDB", "Docker"], "branches": ["CSE", "IT"], "is_dream_company": False},
    ]
    import random
    job_ids = []
    for i, j in enumerate(jobs):
        jid = str(uuid.uuid4())
        job_ids.append(jid)
        await db.jobs.insert_one({
            "id": jid, "company_id": company_ids[i % len(company_ids)], "status": "active",
            "featured": i == 0, "description": f"We are hiring a {j['title']} to join our engineering team.",
            "eligibility_cgpa": 7.0, "max_backlogs": 0, "departments": [], "passing_year": 2026,
            "gender": "Any", "degree": "B.Tech", "openings": random.randint(2, 6),
            "experience": "Fresher", "deadline": None, "created_at": now_iso(), **j})

    statuses = ["applied", "under_review", "shortlisted", "selected"]
    for si, sid in enumerate(student_ids):
        for ji, jid in enumerate(job_ids[:3]):
            ts = now_iso()
            st = statuses[(si + ji) % len(statuses)]
            job = await db.jobs.find_one({"id": jid})
            await db.applications.insert_one({
                "id": str(uuid.uuid4()), "job_id": jid, "company_id": job["company_id"],
                "student_id": sid, "status": st, "created_at": ts,
                "timeline": [{"status": "applied", "at": ts, "note": "Application submitted"}]})
    logger.info("Demo data seeded.")

    # demo campus drive + event
    drive_id = str(uuid.uuid4())
    await db.drives.insert_one({
        "id": drive_id, "company_id": company_ids[0], "title": "Nimbus Cloud Campus Drive 2026",
        "role": "Software Engineer", "package_min": 12, "package_max": 18, "location": "Bengaluru",
        "description": "Full-day campus drive with aptitude, technical and HR rounds.",
        "drive_type": "Full-Time", "eligibility_cgpa": 7.0, "max_backlogs": 0,
        "branches": ["CSE", "IT"], "departments": [], "passing_year": 2026, "gender": "Any", "degree": "B.Tech",
        "registration_deadline": (now_utc() + timedelta(days=5)).date().isoformat(),
        "drive_date": (now_utc() + timedelta(days=10)).date().isoformat(),
        "max_applicants": 100, "rounds": ["Aptitude", "Technical", "HR"],
        "status": "registration_open", "moderation": "approved", "created_at": now_iso()})
    await db.events.insert_one({
        "id": str(uuid.uuid4()), "title": "Pre-Placement Talk: Nimbus Cloud",
        "description": "Company presentation and Q&A.", "type": "ppt",
        "date": (now_utc() + timedelta(days=3)).date().isoformat(),
        "created_by": "Placement Cell Admin", "created_at": now_iso()})


@app.on_event("startup")
async def startup():
    await seed()


@app.on_event("shutdown")
async def shutdown():
    client.close()
