"""PlacementHub iteration 4 — OTP reset, drives, interviews, calendar, reminders, RBAC."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

SUPER = ("admin@placementhub.com", "Admin@123")
COORD = ("coordinator@placementhub.com", "Staff@123")
COMPANY = ("hr@nimbuscloud.com", "Company@123")
STUDENT = ("aarav@student.com", "Student@123")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def super_tok():
    return _login(*SUPER)


@pytest.fixture(scope="module")
def company_tok():
    return _login(*COMPANY)


@pytest.fixture(scope="module")
def student_tok():
    return _login(*STUDENT)


@pytest.fixture(scope="module")
def coord_tok():
    return _login(*COORD)


# ------------------ Password reset (OTP) ------------------

def _register_throwaway():
    email = f"TEST_reset_{uuid.uuid4().hex[:8]}@x.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "Reset Me", "email": email, "password": "Passw0rd!", "role": "student"})
    assert r.status_code == 200
    return email


class TestPasswordReset:
    def test_forgot_password_unknown_no_enum(self):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": f"nobody_{uuid.uuid4().hex[:6]}@x.com"})
        assert r.status_code == 200
        d = r.json()
        assert "dev_otp" not in d
        assert "message" in d

    def test_full_flow_success(self):
        email = _register_throwaway()
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200
        otp = r.json().get("dev_otp")
        assert otp and len(otp) == 6

        # wrong OTP -> 400 with attempts-left
        r_w = requests.post(f"{API}/auth/verify-otp", json={"email": email, "otp": "000000"})
        # secrets.randbelow could yield 000000 - retry with 111111 if so
        if r_w.status_code == 200:
            r_w = requests.post(f"{API}/auth/verify-otp", json={"email": email, "otp": "111111"})
        assert r_w.status_code == 400
        assert "attempts left" in r_w.json()["detail"].lower()

        # verify correct
        r2 = requests.post(f"{API}/auth/verify-otp", json={"email": email, "otp": otp})
        assert r2.status_code == 200, r2.text
        rt = r2.json()["reset_token"]

        # weak password
        r_bad = requests.post(f"{API}/auth/reset-password", json={
            "reset_token": rt, "new_password": "weak", "confirm_password": "weak"})
        assert r_bad.status_code == 400
        assert "password" in r_bad.json()["detail"].lower()

        # mismatched
        r_mis = requests.post(f"{API}/auth/reset-password", json={
            "reset_token": rt, "new_password": "NewPass@1", "confirm_password": "Other@1x"})
        assert r_mis.status_code == 400
        assert "match" in r_mis.json()["detail"].lower()

        # success
        r_ok = requests.post(f"{API}/auth/reset-password", json={
            "reset_token": rt, "new_password": "NewPass@1", "confirm_password": "NewPass@1"})
        assert r_ok.status_code == 200

        # login with new pw
        r_l = requests.post(f"{API}/auth/login", json={"email": email, "password": "NewPass@1"})
        assert r_l.status_code == 200

        # reset token cannot be reused
        r_reuse = requests.post(f"{API}/auth/reset-password", json={
            "reset_token": rt, "new_password": "NewPass@1", "confirm_password": "NewPass@1"})
        assert r_reuse.status_code == 400


# ------------------ Drives ------------------

@pytest.fixture(scope="module")
def created_drive(company_tok, super_tok):
    body = {
        "title": f"TEST_Drive_{uuid.uuid4().hex[:6]}",
        "role": "Software Engineer",
        "package_min": 8, "package_max": 12,
        "location": "Bangalore", "description": "Test drive",
        "drive_type": "Full-Time",
        "eligibility_cgpa": 7.0, "max_backlogs": 0,
        "branches": ["CSE", "IT"], "passing_year": 2026, "degree": "B.Tech",
        "status": "registration_open",
    }
    r = requests.post(f"{API}/drives", headers=H(company_tok), json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["moderation"] == "pending"
    yield d
    # cleanup: archive it
    requests.patch(f"{API}/drives/{d['id']}/moderation",
                   headers=H(super_tok), json={"status": "archived"})


class TestDrives:
    def test_admin_sees_pending(self, super_tok, created_drive):
        r = requests.get(f"{API}/drives", headers=H(super_tok))
        assert r.status_code == 200
        ids = [d["id"] for d in r.json()]
        assert created_drive["id"] in ids

    def test_student_cannot_see_pending(self, student_tok, created_drive):
        r = requests.get(f"{API}/drives", headers=H(student_tok))
        assert r.status_code == 200
        ids = [d["id"] for d in r.json()]
        assert created_drive["id"] not in ids

    def test_coord_cannot_moderate(self, coord_tok, created_drive):
        r = requests.patch(f"{API}/drives/{created_drive['id']}/moderation",
                           headers=H(coord_tok), json={"status": "approved"})
        assert r.status_code == 403

    def test_admin_approves(self, super_tok, created_drive):
        r = requests.patch(f"{API}/drives/{created_drive['id']}/moderation",
                           headers=H(super_tok), json={"status": "approved"})
        assert r.status_code == 200
        # student now sees it
        r2 = requests.get(f"{API}/drives", headers=H(_login(*STUDENT)))
        ids = [d["id"] for d in r2.json()]
        assert created_drive["id"] in ids

    def test_student_register_and_withdraw(self, student_tok, created_drive):
        r = requests.post(f"{API}/drives/{created_drive['id']}/register", headers=H(student_tok))
        assert r.status_code == 200, r.text
        # duplicate
        r2 = requests.post(f"{API}/drives/{created_drive['id']}/register", headers=H(student_tok))
        assert r2.status_code == 400
        # my drives
        rm = requests.get(f"{API}/drives/me/registered", headers=H(student_tok))
        assert rm.status_code == 200
        assert any(x["drive_id"] == created_drive["id"] for x in rm.json())
        # withdraw
        rw = requests.delete(f"{API}/drives/{created_drive['id']}/register", headers=H(student_tok))
        assert rw.status_code == 200
        # re-register for pipeline tests
        r3 = requests.post(f"{API}/drives/{created_drive['id']}/register", headers=H(student_tok))
        assert r3.status_code == 200

    def test_recruiter_pipeline_and_stage(self, company_tok, student_tok, created_drive):
        r = requests.get(f"{API}/drives/{created_drive['id']}/registrations", headers=H(company_tok))
        assert r.status_code == 200
        regs = r.json()
        assert len(regs) >= 1
        reg_id = regs[0]["id"]
        r2 = requests.patch(f"{API}/registrations/{reg_id}/stage",
                            headers=H(company_tok), json={"status": "shortlisted"})
        assert r2.status_code == 200
        # invalid stage
        r_bad = requests.patch(f"{API}/registrations/{reg_id}/stage",
                               headers=H(company_tok), json={"status": "bogus"})
        assert r_bad.status_code == 400


# ------------------ Interviews ------------------

@pytest.fixture(scope="module")
def scheduled_interview(company_tok, student_tok, created_drive):
    # get student id
    me = requests.get(f"{API}/auth/me", headers=H(student_tok)).json()
    body = {
        "student_id": me["id"], "drive_id": created_drive["id"],
        "round_type": "Technical Round", "round_number": 1, "mode": "Online",
        "date": "2026-02-15", "time": "10:30",
        "meeting_link": "https://meet.example.com/x",
    }
    r = requests.post(f"{API}/interviews", headers=H(company_tok), json=body)
    assert r.status_code == 200, r.text
    return r.json()


class TestInterviews:
    def test_student_sees(self, student_tok, scheduled_interview):
        r = requests.get(f"{API}/interviews/me", headers=H(student_tok))
        assert r.status_code == 200
        assert any(i["id"] == scheduled_interview["id"] for i in r.json())

    def test_student_accept(self, student_tok, scheduled_interview):
        r = requests.patch(f"{API}/interviews/{scheduled_interview['id']}/respond",
                           headers=H(student_tok), json={"response": "accepted"})
        assert r.status_code == 200
        # verify persisted
        r2 = requests.get(f"{API}/interviews/me", headers=H(student_tok))
        iv = next(i for i in r2.json() if i["id"] == scheduled_interview["id"])
        assert iv["student_response"] == "accepted"

    def test_student_reschedule(self, student_tok, scheduled_interview):
        r = requests.patch(f"{API}/interviews/{scheduled_interview['id']}/respond",
                           headers=H(student_tok), json={"response": "reschedule_requested"})
        assert r.status_code == 200

    def test_recruiter_update_status(self, company_tok, scheduled_interview):
        r = requests.patch(f"{API}/interviews/{scheduled_interview['id']}",
                           headers=H(company_tok), json={"status": "rescheduled"})
        assert r.status_code == 200
        assert r.json()["status"] == "rescheduled"

    def test_recruiter_invalid_status(self, company_tok, scheduled_interview):
        r = requests.patch(f"{API}/interviews/{scheduled_interview['id']}",
                           headers=H(company_tok), json={"status": "bogus"})
        assert r.status_code == 400

    def test_recruiter_feedback_completes(self, company_tok, student_tok, scheduled_interview):
        r = requests.post(f"{API}/interviews/{scheduled_interview['id']}/feedback",
                          headers=H(company_tok), json={
                              "communication": 4, "technical_skills": 5,
                              "problem_solving": 4, "confidence": 4, "overall_rating": 4,
                              "recommendation": "Strong hire", "comments": "Good",
                              "status": "pass"})
        assert r.status_code == 200, r.text
        # student sees feedback + completed
        r2 = requests.get(f"{API}/interviews/me", headers=H(student_tok))
        iv = next(i for i in r2.json() if i["id"] == scheduled_interview["id"])
        assert iv["status"] == "completed"
        assert iv["feedback"] is not None
        assert iv["feedback"]["status"] == "pass"


# ------------------ Calendar & Events & Reminders ------------------

class TestCalendarEventsReminders:
    def test_calendar_student(self, student_tok):
        r = requests.get(f"{API}/calendar", headers=H(student_tok))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_calendar_recruiter(self, company_tok):
        r = requests.get(f"{API}/calendar", headers=H(company_tok))
        assert r.status_code == 200

    def test_calendar_admin(self, super_tok):
        r = requests.get(f"{API}/calendar", headers=H(super_tok))
        assert r.status_code == 200

    def test_admin_create_event(self, super_tok):
        title = f"TEST_Event_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/events", headers=H(super_tok),
                          json={"title": title, "date": "2026-02-20", "type": "event"})
        assert r.status_code == 200, r.text
        # appears in calendar
        rc = requests.get(f"{API}/calendar", headers=H(super_tok))
        assert any(i["title"] == title for i in rc.json())

    def test_reminders(self, student_tok):
        r = requests.get(f"{API}/reminders", headers=H(student_tok))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ------------------ Dashboard widgets stats ------------------

class TestStatsWidgets:
    def test_student_stats(self, student_tok):
        r = requests.get(f"{API}/student/stats", headers=H(student_tok))
        assert r.status_code == 200
        d = r.json()
        for k in ["upcoming_interviews", "upcoming_drives", "pending_documents"]:
            assert k in d, f"missing {k} in {d.keys()}"

    def test_recruiter_stats(self, company_tok):
        r = requests.get(f"{API}/company/stats", headers=H(company_tok))
        assert r.status_code == 200
        d = r.json()
        for k in ["todays_interviews", "upcoming_drives", "pending_feedback"]:
            assert k in d, f"missing {k} in {d.keys()}"

    def test_admin_stats_ext(self, super_tok):
        r = requests.get(f"{API}/admin/stats", headers=H(super_tok))
        assert r.status_code == 200
        d = r.json()
        for k in ["active_drives", "pending_interviews", "todays_events"]:
            assert k in d, f"missing {k} in {d.keys()}"
