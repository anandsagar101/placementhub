"""PlacementHub backend end-to-end API tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://recruit-link-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@placementhub.com", "Admin@123")
COMPANY = ("hr@nimbuscloud.com", "Company@123")
STUDENT = ("aarav@student.com", "Student@123")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def student_token():
    return _login(*STUDENT)


@pytest.fixture(scope="session")
def company_token():
    return _login(*COMPANY)


@pytest.fixture(scope="session")
def admin_token():
    return _login(*ADMIN)


# --- Health ---
class TestHealth:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_demo_seeded(self):
        # public jobs endpoint returns seeded jobs
        r = requests.get(f"{API}/jobs", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 4


# --- Auth ---
class TestAuth:
    def test_register_student(self):
        email = f"TEST_stud_{uuid.uuid4().hex[:8]}@student.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "Test Student", "email": email, "password": "Passw0rd!", "role": "student"
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["token"] and data["user"]["role"] == "student"
        assert data["user"]["email"] == email.lower()

    def test_register_company(self):
        email = f"TEST_co_{uuid.uuid4().hex[:8]}@corp.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "Test Corp", "email": email, "password": "Passw0rd!", "role": "company",
            "company_name": "Test Corp Ltd"
        }, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "company"

    def test_login_and_me(self, student_token):
        r = requests.get(f"{API}/auth/me", headers=_h(student_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == STUDENT[0]
        assert "password_hash" not in r.json()

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": STUDENT[0], "password": "wrong"}, timeout=15)
        assert r.status_code == 401
        assert "Invalid" in r.json().get("detail", "")


# --- Student flow ---
class TestStudent:
    def test_student_stats(self, student_token):
        r = requests.get(f"{API}/student/stats", headers=_h(student_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_applications", "shortlisted", "selected", "open_jobs", "status_distribution"]:
            assert k in d

    def test_jobs_list_with_flag(self, student_token):
        r = requests.get(f"{API}/jobs", headers=_h(student_token), timeout=15)
        assert r.status_code == 200
        jobs = r.json()
        assert len(jobs) > 0
        assert all("already_applied" in j for j in jobs)
        assert all(j["status"] == "active" for j in jobs)

    def test_jobs_search_filter(self, student_token):
        r = requests.get(f"{API}/jobs?search=Engineer", headers=_h(student_token), timeout=15)
        assert r.status_code == 200
        jobs = r.json()
        assert len(jobs) >= 1
        assert all("engineer" in (j["title"] + j.get("description", "")).lower() or "engineer" in j.get("location","").lower() for j in jobs)

    def test_apply_and_duplicate(self, student_token):
        # find a job student hasn't applied to
        jobs = requests.get(f"{API}/jobs", headers=_h(student_token), timeout=15).json()
        candidate = next((j for j in jobs if not j["already_applied"]), None)
        if not candidate:
            pytest.skip("no unapplied jobs remaining")
        r = requests.post(f"{API}/jobs/{candidate['id']}/apply", headers=_h(student_token), timeout=15)
        assert r.status_code == 200, r.text
        app_doc = r.json()
        assert app_doc["status"] == "applied"
        assert app_doc["timeline"][0]["status"] == "applied"
        # duplicate
        r2 = requests.post(f"{API}/jobs/{candidate['id']}/apply", headers=_h(student_token), timeout=15)
        assert r2.status_code == 400

    def test_applications_me(self, student_token):
        r = requests.get(f"{API}/applications/me", headers=_h(student_token), timeout=15)
        assert r.status_code == 200
        apps = r.json()
        assert len(apps) >= 1
        assert "job" in apps[0] and "timeline" in apps[0]

    def test_unauth_applications(self):
        r = requests.get(f"{API}/applications/me", timeout=15)
        assert r.status_code == 401

    def test_student_cannot_post_job(self, student_token):
        r = requests.post(f"{API}/jobs", headers=_h(student_token), json={
            "title": "x", "description": "y"
        }, timeout=15)
        assert r.status_code == 403


# --- Company flow ---
class TestCompany:
    _created_job_id = None

    def test_create_job(self, company_token):
        r = requests.post(f"{API}/jobs", headers=_h(company_token), json={
            "title": "TEST_Backend Engineer", "description": "Test job",
            "role_type": "Full-time", "location": "Remote",
            "ctc_min": 10, "ctc_max": 20, "skills": ["Python"], "branches": ["CSE"], "openings": 2
        }, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["status"] == "active"
        TestCompany._created_job_id = j["id"]

    def test_mine_jobs(self, company_token):
        r = requests.get(f"{API}/jobs?mine=true", headers=_h(company_token), timeout=15)
        assert r.status_code == 200
        jobs = r.json()
        assert len(jobs) >= 1
        me = requests.get(f"{API}/auth/me", headers=_h(company_token)).json()
        assert all(j["company_id"] == me["id"] for j in jobs)

    def test_received_applications_and_status(self, company_token):
        r = requests.get(f"{API}/applications/received", headers=_h(company_token), timeout=15)
        assert r.status_code == 200
        apps = r.json()
        if not apps:
            pytest.skip("no received applications")
        assert "student" in apps[0]
        app_id = apps[0]["id"]
        r2 = requests.patch(f"{API}/applications/{app_id}/status",
                            headers=_h(company_token),
                            json={"status": "shortlisted", "note": "looks good"}, timeout=15)
        assert r2.status_code == 200, r2.text
        updated = r2.json()
        assert updated["status"] == "shortlisted"
        assert any(t["status"] == "shortlisted" for t in updated["timeline"])

    def test_job_status_toggle(self, company_token):
        jid = TestCompany._created_job_id
        assert jid
        r = requests.patch(f"{API}/jobs/{jid}/status", headers=_h(company_token),
                           json={"status": "closed"}, timeout=15)
        assert r.status_code == 200
        r = requests.patch(f"{API}/jobs/{jid}/status", headers=_h(company_token),
                           json={"status": "active"}, timeout=15)
        assert r.status_code == 200

    def test_cross_company_forbidden(self, company_token):
        # login as another company
        other = _login("talent@quanticlabs.com", "Company@123")
        jid = TestCompany._created_job_id
        r = requests.patch(f"{API}/jobs/{jid}/status", headers=_h(other),
                           json={"status": "closed"}, timeout=15)
        assert r.status_code == 403
        r = requests.delete(f"{API}/jobs/{jid}", headers=_h(other), timeout=15)
        assert r.status_code == 403

    def test_delete_own_job(self, company_token):
        jid = TestCompany._created_job_id
        r = requests.delete(f"{API}/jobs/{jid}", headers=_h(company_token), timeout=15)
        assert r.status_code == 200

    def test_company_stats(self, company_token):
        r = requests.get(f"{API}/company/stats", headers=_h(company_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_jobs", "active_jobs", "total_applications", "hired", "status_distribution"]:
            assert k in d
        assert len(d["status_distribution"]) == 6


# --- Admin flow ---
class TestAdmin:
    def test_admin_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_students", "total_companies", "total_jobs", "placement_rate",
                  "trend", "top_companies", "status_distribution"]:
            assert k in d
        assert isinstance(d["trend"], list) and len(d["trend"]) == 6

    def test_admin_users(self, admin_token):
        r = requests.get(f"{API}/admin/users?role=student", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        students = r.json()
        assert len(students) >= 3
        assert all("applications_count" in s for s in students)
        r = requests.get(f"{API}/admin/users?role=company", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        comps = r.json()
        assert all("jobs_count" in c for c in comps)

    def test_admin_sees_all_jobs(self, admin_token, company_token):
        # create then close a job
        j = requests.post(f"{API}/jobs", headers=_h(company_token), json={
            "title": "TEST_ClosedJob", "description": "d"
        }, timeout=15).json()
        requests.patch(f"{API}/jobs/{j['id']}/status", headers=_h(company_token),
                       json={"status": "closed"}, timeout=15)
        r = requests.get(f"{API}/jobs", headers=_h(admin_token), timeout=15)
        ids = [x["id"] for x in r.json()]
        assert j["id"] in ids
        # cleanup
        requests.delete(f"{API}/jobs/{j['id']}", headers=_h(company_token), timeout=15)

    def test_admin_delete_user(self, admin_token):
        # register a throwaway then delete
        email = f"TEST_del_{uuid.uuid4().hex[:8]}@t.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "x", "email": email, "password": "Passw0rd!", "role": "student"
        }).json()
        uid = reg["user"]["id"]
        r = requests.delete(f"{API}/admin/users/{uid}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
