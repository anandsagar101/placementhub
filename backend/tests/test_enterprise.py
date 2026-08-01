"""PlacementHub enterprise features API tests (iteration 2)."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

SUPER = ("admin@placementhub.com", "Admin@123")
OFFICER = ("officer@placementhub.com", "Staff@123")
COORD = ("coordinator@placementhub.com", "Staff@123")
COMPANY = ("hr@nimbuscloud.com", "Company@123")
STUDENT = ("aarav@student.com", "Student@123")
STUDENT2 = ("diya@student.com", "Student@123")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="session")
def super_tok():
    return _login(*SUPER)


@pytest.fixture(scope="session")
def officer_tok():
    return _login(*OFFICER)


@pytest.fixture(scope="session")
def coord_tok():
    return _login(*COORD)


@pytest.fixture(scope="session")
def company_tok():
    return _login(*COMPANY)


@pytest.fixture(scope="session")
def student_tok():
    return _login(*STUDENT)


# ---------------- verification gating ----------------
class TestVerificationGating:
    def test_new_student_pending_cannot_apply(self, student_tok):
        # register a new student
        email = f"TEST_pending_{uuid.uuid4().hex[:8]}@x.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "Pending Stud", "email": email, "password": "Passw0rd!", "role": "student"
        })
        assert r.status_code == 200
        tok = r.json()["token"]
        assert r.json()["user"].get("verification_status") == "pending"
        # find any active job
        jobs = requests.get(f"{API}/jobs", headers=H(tok)).json()
        assert len(jobs) > 0
        jid = jobs[0]["id"]
        r2 = requests.post(f"{API}/jobs/{jid}/apply", headers=H(tok))
        assert r2.status_code == 403
        assert "verified" in r2.json()["detail"].lower()

    def test_seeded_student_can_apply(self, student_tok):
        jobs = requests.get(f"{API}/jobs", headers=H(student_tok)).json()
        cand = next((j for j in jobs if not j["already_applied"] and j.get("eligible")), None)
        if not cand:
            pytest.skip("no unapplied eligible job")
        r = requests.post(f"{API}/jobs/{cand['id']}/apply", headers=H(student_tok))
        assert r.status_code == 200, r.text


class TestAdminVerification:
    def test_admin_approve_pending_student(self, super_tok):
        email = f"TEST_verify_{uuid.uuid4().hex[:8]}@x.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "Verify Me", "email": email, "password": "Passw0rd!", "role": "student"
        }).json()
        sid = reg["user"]["id"]
        r = requests.patch(f"{API}/admin/students/{sid}/verification",
                           headers=H(super_tok), json={"status": "approved", "remarks": "ok"})
        assert r.status_code == 200
        # verify state
        s = requests.get(f"{API}/admin/students/{sid}", headers=H(super_tok)).json()
        assert s["verification_status"] == "approved"
        # notification created?
        tok = reg["token"]
        n = requests.get(f"{API}/notifications", headers=H(tok)).json()
        assert any("Verification" in i["title"] for i in n["items"])


class TestRecruiterApproval:
    def test_pending_company_cannot_post(self, super_tok):
        email = f"TEST_co_{uuid.uuid4().hex[:8]}@corp.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "PendingCo", "email": email, "password": "Passw0rd!",
            "role": "company", "company_name": "PendingCo"
        }).json()
        tok = reg["token"]
        cid = reg["user"]["id"]
        r = requests.post(f"{API}/jobs", headers=H(tok),
                          json={"title": "TEST_x", "description": "y"})
        assert r.status_code == 403
        # approve
        r2 = requests.patch(f"{API}/admin/companies/{cid}/approval",
                            headers=H(super_tok), json={"status": "approved"})
        assert r2.status_code == 200
        # now can post
        r3 = requests.post(f"{API}/jobs", headers=H(tok),
                           json={"title": "TEST_ApprovedJob", "description": "y"})
        assert r3.status_code == 200
        requests.delete(f"{API}/jobs/{r3.json()['id']}", headers=H(tok))


# ---------------- documents & cloudinary ----------------
class TestDocuments:
    def test_signature(self, student_tok):
        r = requests.get(f"{API}/cloudinary/signature?resource_type=image", headers=H(student_tok))
        assert r.status_code == 200
        d = r.json()
        for k in ["signature", "timestamp", "cloud_name", "api_key", "folder"]:
            assert k in d

    def test_upload_and_verify_doc(self, student_tok, super_tok):
        # upload placeholder doc
        r = requests.post(f"{API}/documents", headers=H(student_tok), json={
            "doc_type": "certificate", "url": "https://example.com/x.pdf",
            "public_id": f"TEST_{uuid.uuid4().hex[:6]}", "resource_type": "raw", "format": "pdf"
        })
        assert r.status_code == 200
        user = r.json()
        assert user["documents"]["certificate"]["status"] == "pending"
        sid = user["id"]
        # admin verify
        r2 = requests.patch(f"{API}/admin/documents/{sid}/certificate",
                            headers=H(super_tok), json={"status": "verified"})
        assert r2.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=H(student_tok)).json()
        assert me["documents"]["certificate"]["status"] == "verified"


# ---------------- eligibility ----------------
class TestEligibility:
    def test_eligibility_endpoint(self, student_tok):
        jobs = requests.get(f"{API}/jobs", headers=H(student_tok)).json()
        jid = jobs[0]["id"]
        r = requests.get(f"{API}/jobs/{jid}/eligibility", headers=H(student_tok))
        assert r.status_code == 200
        d = r.json()
        for k in ["checks", "eligible", "verified", "frozen", "profile", "placed"]:
            assert k in d

    def test_ineligible_apply_blocked(self, super_tok, company_tok):
        # create a job with high CGPA req
        job = requests.post(f"{API}/jobs", headers=H(company_tok), json={
            "title": "TEST_ImpossibleJob", "description": "z",
            "eligibility_cgpa": 9.9, "max_backlogs": 0,
            "branches": ["CSE", "IT", "ECE"], "passing_year": 2026, "degree": "B.Tech"
        })
        assert job.status_code == 200
        jid = job.json()["id"]
        # kabir cgpa=7.9 → ineligible
        ktok = _login("kabir@student.com", "Student@123")
        r = requests.post(f"{API}/jobs/{jid}/apply", headers=H(ktok))
        assert r.status_code == 403
        assert "eligible" in r.json()["detail"].lower() or "cgpa" in r.json()["detail"].lower()
        requests.delete(f"{API}/jobs/{jid}", headers=H(company_tok))


# ---------------- freeze / unfreeze ----------------
class TestFreeze:
    def test_freeze_blocks_and_unfreeze_restores(self, super_tok, company_tok):
        # register new student and approve
        email = f"TEST_frz_{uuid.uuid4().hex[:8]}@x.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "Freeze Me", "email": email, "password": "Passw0rd!", "role": "student"
        }).json()
        stok, sid = reg["token"], reg["user"]["id"]
        # give mandatory profile
        requests.put(f"{API}/profile", headers=H(stok), json={
            "phone": "9000000001", "branch": "CSE", "degree": "B.Tech",
            "graduation_year": 2026, "cgpa": 8.5, "skills": ["Python"]
        })
        # add mandatory docs
        for dt in ["resume", "marksheet_10", "marksheet_12"]:
            requests.post(f"{API}/documents", headers=H(stok), json={
                "doc_type": dt, "url": "https://ex.com/x", "public_id": f"p_{dt}_{uuid.uuid4().hex[:4]}",
                "resource_type": "raw", "format": "pdf"
            })
        requests.patch(f"{API}/admin/students/{sid}/verification",
                       headers=H(super_tok), json={"status": "approved"})
        # freeze
        r = requests.patch(f"{API}/admin/students/{sid}/freeze",
                           headers=H(super_tok), json={"frozen": True, "reason": "Disciplinary Action"})
        assert r.status_code == 200
        # try apply
        jobs = requests.get(f"{API}/jobs", headers=H(stok)).json()
        jid = jobs[0]["id"]
        r2 = requests.post(f"{API}/jobs/{jid}/apply", headers=H(stok))
        assert r2.status_code == 403
        assert "frozen" in r2.json()["detail"].lower()
        # unfreeze
        r3 = requests.patch(f"{API}/admin/students/{sid}/freeze",
                            headers=H(super_tok), json={"frozen": False})
        assert r3.status_code == 200


# ---------------- offer + placement policy ----------------
class TestOfferPlacement:
    def test_select_creates_offer_and_accept_places(self, super_tok, company_tok):
        # setup: fresh student verified with valid profile
        email = f"TEST_off_{uuid.uuid4().hex[:8]}@x.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "Offeree", "email": email, "password": "Passw0rd!", "role": "student"
        }).json()
        stok, sid = reg["token"], reg["user"]["id"]
        requests.put(f"{API}/profile", headers=H(stok), json={
            "phone": "9000000002", "branch": "CSE", "degree": "B.Tech",
            "graduation_year": 2026, "cgpa": 8.5, "skills": ["Python"]
        })
        for dt in ["resume", "marksheet_10", "marksheet_12"]:
            requests.post(f"{API}/documents", headers=H(stok), json={
                "doc_type": dt, "url": "https://ex.com/x", "public_id": f"p2_{dt}_{uuid.uuid4().hex[:4]}",
                "resource_type": "raw", "format": "pdf"
            })
        requests.patch(f"{API}/admin/students/{sid}/verification",
                       headers=H(super_tok), json={"status": "approved"})
        # create normal job and dream company higher-package job
        j_normal = requests.post(f"{API}/jobs", headers=H(company_tok), json={
            "title": "TEST_NormalJob", "description": "n",
            "eligibility_cgpa": 7.0, "max_backlogs": 0,
            "branches": ["CSE"], "passing_year": 2026, "degree": "B.Tech",
            "ctc_min": 8, "ctc_max": 10, "is_dream_company": False
        }).json()
        j_dream = requests.post(f"{API}/jobs", headers=H(company_tok), json={
            "title": "TEST_DreamJob", "description": "d",
            "eligibility_cgpa": 7.0, "max_backlogs": 0,
            "branches": ["CSE"], "passing_year": 2026, "degree": "B.Tech",
            "ctc_min": 20, "ctc_max": 30, "is_dream_company": True
        }).json()
        j_normal2 = requests.post(f"{API}/jobs", headers=H(company_tok), json={
            "title": "TEST_NormalJob2", "description": "n2",
            "eligibility_cgpa": 7.0, "max_backlogs": 0,
            "branches": ["CSE"], "passing_year": 2026, "degree": "B.Tech",
            "ctc_min": 8, "ctc_max": 12, "is_dream_company": False
        }).json()

        # apply to normal
        ra = requests.post(f"{API}/jobs/{j_normal['id']}/apply", headers=H(stok))
        assert ra.status_code == 200, ra.text
        app_id = ra.json()["id"]
        # company selects
        rs = requests.patch(f"{API}/applications/{app_id}/status",
                            headers=H(company_tok), json={"status": "selected"})
        assert rs.status_code == 200
        # offer created
        offers = requests.get(f"{API}/offers/me", headers=H(stok)).json()
        assert len(offers) >= 1
        oid = offers[0]["id"]
        # accept
        ra2 = requests.patch(f"{API}/offers/{oid}", headers=H(stok), json={"status": "accepted"})
        assert ra2.status_code == 200
        # verify placed + frozen
        me = requests.get(f"{API}/auth/me", headers=H(stok)).json()
        assert me["placed"] is True
        assert me["frozen"] is True
        assert me["freeze_reason"] == "Already Placed"
        # cannot apply normal
        rn = requests.post(f"{API}/jobs/{j_normal2['id']}/apply", headers=H(stok))
        assert rn.status_code == 403
        # CAN apply dream (higher package)
        rd = requests.post(f"{API}/jobs/{j_dream['id']}/apply", headers=H(stok))
        assert rd.status_code == 200, rd.text
        # cleanup
        for j in (j_normal, j_normal2, j_dream):
            requests.delete(f"{API}/jobs/{j['id']}", headers=H(company_tok))


# ---------------- notifications ----------------
class TestNotifications:
    def test_notification_center(self, student_tok):
        r = requests.get(f"{API}/notifications", headers=H(student_tok))
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "unread" in d
        r2 = requests.patch(f"{API}/notifications/read-all", headers=H(student_tok))
        assert r2.status_code == 200
        d2 = requests.get(f"{API}/notifications", headers=H(student_tok)).json()
        assert d2["unread"] == 0


# ---------------- RBAC ----------------
class TestRBAC:
    def test_officer_can_verify(self, officer_tok):
        # register temp student
        email = f"TEST_off_verify_{uuid.uuid4().hex[:8]}@x.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "V", "email": email, "password": "Passw0rd!", "role": "student"
        }).json()
        sid = reg["user"]["id"]
        r = requests.patch(f"{API}/admin/students/{sid}/verification",
                           headers=H(officer_tok), json={"status": "approved"})
        assert r.status_code == 200

    def test_officer_cannot_delete_user(self, officer_tok):
        email = f"TEST_del_{uuid.uuid4().hex[:8]}@x.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "V", "email": email, "password": "Passw0rd!", "role": "student"
        }).json()
        sid = reg["user"]["id"]
        r = requests.delete(f"{API}/admin/users/{sid}", headers=H(officer_tok))
        assert r.status_code == 403

    def test_coordinator_cannot_freeze(self, coord_tok):
        # need a student id
        email = f"TEST_coord_frz_{uuid.uuid4().hex[:8]}@x.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "V", "email": email, "password": "Passw0rd!", "role": "student"
        }).json()
        sid = reg["user"]["id"]
        r = requests.patch(f"{API}/admin/students/{sid}/freeze",
                           headers=H(coord_tok), json={"frozen": True, "reason": "Manual"})
        assert r.status_code == 403

    def test_coordinator_cannot_approve_recruiter(self, coord_tok):
        email = f"TEST_c_{uuid.uuid4().hex[:8]}@corp.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "cc", "email": email, "password": "Passw0rd!", "role": "company",
            "company_name": "cc"
        }).json()
        cid = reg["user"]["id"]
        r = requests.patch(f"{API}/admin/companies/{cid}/approval",
                           headers=H(coord_tok), json={"status": "approved"})
        assert r.status_code == 403


# ---------------- staff ----------------
class TestStaff:
    def test_super_admin_lists_staff(self, super_tok):
        r = requests.get(f"{API}/admin/staff", headers=H(super_tok))
        assert r.status_code == 200
        staff = r.json()
        assert len(staff) >= 3
        emails = {s["email"] for s in staff}
        assert "officer@placementhub.com" in emails

    def test_officer_cannot_manage_staff(self, officer_tok):
        r = requests.get(f"{API}/admin/staff", headers=H(officer_tok))
        assert r.status_code == 403

    def test_create_staff(self, super_tok):
        email = f"TEST_staff_{uuid.uuid4().hex[:8]}@ph.com"
        r = requests.post(f"{API}/admin/staff", headers=H(super_tok), json={
            "name": "TEST Officer", "email": email, "password": "Passw0rd!",
            "admin_role": "placement_officer"
        })
        assert r.status_code == 200, r.text
        assert r.json()["admin_role"] == "placement_officer"


# ---------------- audit ----------------
class TestAudit:
    def test_audit_after_action(self, super_tok):
        # trigger an action
        email = f"TEST_aud_{uuid.uuid4().hex[:8]}@x.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "AuditMe", "email": email, "password": "Passw0rd!", "role": "student"
        }).json()
        requests.patch(f"{API}/admin/students/{reg['user']['id']}/verification",
                       headers=H(super_tok), json={"status": "approved"})
        r = requests.get(f"{API}/admin/audit", headers=H(super_tok))
        assert r.status_code == 200
        logs = r.json()
        assert len(logs) >= 1
        first = logs[0]
        for k in ["admin_name", "action", "created_at"]:
            assert k in first

    def test_coord_cannot_view_audit(self, coord_tok):
        r = requests.get(f"{API}/admin/audit", headers=H(coord_tok))
        assert r.status_code == 403


# ---------------- admin students filters ----------------
class TestAdminStudentsFilters:
    def test_filter_verification(self, super_tok):
        r = requests.get(f"{API}/admin/students?verification=approved", headers=H(super_tok))
        assert r.status_code == 200
        assert all(s["verification_status"] == "approved" for s in r.json())

    def test_filter_search_and_cgpa(self, super_tok):
        r = requests.get(f"{API}/admin/students?search=aarav&cgpa_min=8", headers=H(super_tok))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_missing_documents(self, super_tok):
        r = requests.get(f"{API}/admin/students?missing_documents=true", headers=H(super_tok))
        assert r.status_code == 200
        # each returned must have missing_docs non-empty
        assert all(len(s.get("missing_docs", [])) > 0 for s in r.json())


# ---------------- extended admin stats ----------------
class TestAdminStatsExtended:
    def test_extended_stats(self, super_tok):
        r = requests.get(f"{API}/admin/stats", headers=H(super_tok))
        assert r.status_code == 200
        d = r.json()
        for k in ["awaiting_verification", "awaiting_recruiter_approval", "pending_documents",
                  "highest_package", "avg_package", "dept_wise", "branch_wise", "trend", "top_companies"]:
            assert k in d
        assert isinstance(d["dept_wise"], list)
        assert isinstance(d["branch_wise"], list)


# ---------------- AI (Claude live) ----------------
class TestAI:
    def test_ai_review(self, student_tok):
        r = requests.post(f"{API}/student/ai-review", headers=H(student_tok), timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["overall", "resume", "skills", "projects", "certificates", "strength_label", "suggestions"]:
            assert k in d
        assert isinstance(d["suggestions"], list)

    def test_recommendations(self, student_tok):
        r = requests.get(f"{API}/student/recommendations", headers=H(student_tok), timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "recommendations" in d
        assert isinstance(d["recommendations"], list)
