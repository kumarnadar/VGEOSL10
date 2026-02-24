#!/usr/bin/env python3
"""
RLS Security Test Runner
========================
Authenticates as different user roles and verifies all RLS policies,
RPC authorization, and privilege escalation trigger.

Usage:
    cd tests/rls
    python run_rls_tests.py

Prerequisites:
    pip install requests
"""

import sys
import json
from supabase_client import (
    get_user_token, SupabaseClient, admin_query, admin_update,
)


# -- Test infrastructure --

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def ok(self, name: str):
        self.passed += 1
        print(f"  [PASS] {name}")

    def fail(self, name: str, detail: str = ""):
        self.failed += 1
        msg = f"  [FAIL] {name}"
        if detail:
            msg += f" -- {detail}"
        self.errors.append(msg)
        print(msg)

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*50}")
        print(f"Summary: {self.passed}/{total} passed, {self.failed} failed")
        if self.errors:
            print(f"\nFailures:")
            for e in self.errors:
                print(f"  {e}")
        return self.failed == 0


results = TestResult()


def assert_status(name: str, resp, expected_codes: list[int]):
    """Check response status code is in expected list."""
    if resp.status_code in expected_codes:
        results.ok(name)
    else:
        body = resp.text[:200] if resp.text else ""
        results.fail(name, f"expected {expected_codes}, got {resp.status_code}: {body}")


def assert_rows(name: str, resp, expect_rows: bool):
    """Check whether response returns rows or empty."""
    if resp.status_code != 200:
        results.fail(name, f"expected 200, got {resp.status_code}")
        return
    data = resp.json()
    has_rows = len(data) > 0
    if has_rows == expect_rows:
        results.ok(name)
    else:
        results.fail(name, f"expected {'rows' if expect_rows else 'empty'}, got {len(data)} rows")


def assert_row_count_lte(name: str, resp, max_count: int):
    """Check response has at most max_count rows."""
    if resp.status_code != 200:
        results.fail(name, f"expected 200, got {resp.status_code}")
        return
    data = resp.json()
    if len(data) <= max_count:
        results.ok(name)
    else:
        results.fail(name, f"expected <= {max_count} rows, got {len(data)}")


# -- Discovery --

def discover_test_data():
    """Find users by role, groups, rocks, issues for test references."""
    print("Discovering test data...\n")

    profiles = admin_query("profiles", "id,email,full_name,role")
    print(f"  Found {len(profiles)} profiles")

    groups = admin_query("groups", "id,name")
    print(f"  Found {len(groups)} groups")

    members = admin_query("group_members", "id,group_id,user_id,role_in_group")
    print(f"  Found {len(members)} group memberships")

    rocks = admin_query("rocks", "id,title,group_id,owner_id", "limit=10")
    print(f"  Found {len(rocks)} rocks (sample)")

    issues = admin_query("issues", "id,description,group_id,raised_by", "limit=5")
    print(f"  Found {len(issues)} issues (sample)")

    meetings = admin_query("meetings", "id,meeting_date,group_id", "limit=5")

    quarters = admin_query("quarters", "id,label,is_current", "limit=5")

    rock_ideas = admin_query("rock_ideas", "id,description,group_id", "limit=5")

    user_groups = {}
    for m in members:
        uid = m["user_id"]
        if uid not in user_groups:
            user_groups[uid] = []
        user_groups[uid].append(m["group_id"])

    return {
        "profiles": profiles,
        "groups": groups,
        "members": members,
        "rocks": rocks,
        "issues": issues,
        "meetings": meetings,
        "quarters": quarters,
        "rock_ideas": rock_ideas,
        "user_groups": user_groups,
    }


def find_user_by_role(profiles: list, role: str) -> dict | None:
    """Find first user with the given role."""
    for p in profiles:
        if p["role"] == role:
            return p
    return None


def find_group_not_containing(user_id: str, user_groups: dict, all_groups: list) -> dict | None:
    """Find a group the user is NOT a member of."""
    user_gids = set(user_groups.get(user_id, []))
    for g in all_groups:
        if g["id"] not in user_gids:
            return g
    return None


# -- Test suites --

def test_profiles(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test profiles table RLS."""
    print(f"\n--- profiles ({role}) ---")

    resp = client.select("profiles")
    assert_rows(f"profiles SELECT all", resp, True)

    if role == "team_member":
        resp = client.update("profiles", {"full_name": "Test Name Temp"}, {"id": user_id})
        assert_status("profiles UPDATE own name", resp, [200])
        client.update("profiles", {"full_name": data["_original_name"]}, {"id": user_id})

    if role == "team_member":
        resp = client.update("profiles", {"role": "system_admin"}, {"id": user_id})
        assert_status("profiles UPDATE role BLOCKED (trigger)", resp, [400, 403, 409, 500])

    if role == "system_admin":
        tm = find_user_by_role(data["profiles"], "team_member")
        if tm:
            resp = client.update("profiles", {"role": "executive"}, {"id": tm["id"]})
            assert_status("profiles UPDATE other role ALLOWED", resp, [200])
            client.update("profiles", {"role": "team_member"}, {"id": tm["id"]})
        else:
            print("  [SKIP] No team_member user to test role update on")


def test_groups(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test groups table RLS."""
    print(f"\n--- groups ({role}) ---")

    resp = client.select("groups")
    if role == "team_member":
        user_gids = set(data["user_groups"].get(user_id, []))
        if resp.status_code == 200:
            returned_gids = {g["id"] for g in resp.json()}
            if returned_gids.issubset(user_gids | set()):
                results.ok("groups SELECT: only own groups")
            else:
                extra = returned_gids - user_gids
                results.fail("groups SELECT: only own groups", f"saw extra groups: {extra}")
        else:
            results.fail("groups SELECT", f"status {resp.status_code}")
    else:
        assert_rows("groups SELECT all", resp, True)
        if resp.status_code == 200:
            if len(resp.json()) == len(data["groups"]):
                results.ok("groups SELECT: sees ALL groups")
            else:
                results.fail("groups SELECT: sees ALL groups",
                           f"expected {len(data['groups'])}, got {len(resp.json())}")

    if role == "team_member":
        resp = client.insert("groups", {"name": "RLS Test Group"})
        assert_status("groups INSERT BLOCKED", resp, [403, 401])
    elif role == "system_admin":
        resp = client.insert("groups", {"name": "RLS Test Group"})
        assert_status("groups INSERT ALLOWED", resp, [201])
        if resp.status_code == 201:
            gid = resp.json()[0]["id"]
            import requests as req
            headers = {
                "apikey": data["_service_key"],
                "Authorization": f"Bearer {data['_service_key']}",
            }
            req.delete(f"{data['_supabase_url']}/rest/v1/groups?id=eq.{gid}", headers=headers)


def test_rocks(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test rocks table RLS."""
    print(f"\n--- rocks ({role}) ---")

    resp = client.select("rocks")
    if role == "team_member":
        user_gids = set(data["user_groups"].get(user_id, []))
        if resp.status_code == 200:
            rocks = resp.json()
            rock_gids = {r["group_id"] for r in rocks}
            if rock_gids.issubset(user_gids):
                results.ok("rocks SELECT: only own group")
            else:
                extra = rock_gids - user_gids
                results.fail("rocks SELECT: only own group", f"saw groups: {extra}")
        else:
            results.fail("rocks SELECT", f"status {resp.status_code}")

        other_group = find_group_not_containing(user_id, data["user_groups"], data["groups"])
        if other_group:
            resp = client.insert("rocks", {
                "title": "RLS Test Rock",
                "group_id": other_group["id"],
                "owner_id": user_id,
                "quarter_id": data["quarters"][0]["id"] if data["quarters"] else None,
            })
            assert_status("rocks INSERT other group BLOCKED", resp, [403, 401])
        else:
            print("  [SKIP] User is in all groups, cannot test cross-group insert denial")

    elif role in ("executive", "system_admin"):
        assert_rows("rocks SELECT all groups", resp, True)

    if role == "system_admin" and len(data["groups"]) > 0:
        target_group = data["groups"][0]
        quarter = data["quarters"][0] if data["quarters"] else None
        if quarter:
            resp = client.insert("rocks", {
                "title": "RLS Admin Test Rock",
                "group_id": target_group["id"],
                "owner_id": user_id,
                "quarter_id": quarter["id"],
            })
            assert_status("rocks INSERT any group (admin bypass)", resp, [201])
            if resp.status_code == 201:
                rock_id = resp.json()[0]["id"]
                client.delete("rocks", {"id": rock_id})


def test_issues(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test issues table RLS."""
    print(f"\n--- issues ({role}) ---")

    resp = client.select("issues")
    if role == "team_member":
        user_gids = set(data["user_groups"].get(user_id, []))
        if resp.status_code == 200:
            issue_gids = {i["group_id"] for i in resp.json()}
            if issue_gids.issubset(user_gids):
                results.ok("issues SELECT: only own group")
            else:
                results.fail("issues SELECT: only own group",
                           f"saw groups: {issue_gids - user_gids}")
        else:
            results.fail("issues SELECT", f"status {resp.status_code}")

        other_group = find_group_not_containing(user_id, data["user_groups"], data["groups"])
        if other_group:
            resp = client.insert("issues", {
                "description": "RLS test issue",
                "group_id": other_group["id"],
                "raised_by": user_id,
            })
            assert_status("issues INSERT other group BLOCKED", resp, [403, 401])
    else:
        assert_rows("issues SELECT all", resp, True)


def test_focus(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test focus_snapshots and focus_items RLS."""
    print(f"\n--- focus_snapshots ({role}) ---")

    resp = client.select("focus_snapshots")
    if role == "team_member":
        user_gids = set(data["user_groups"].get(user_id, []))
        if resp.status_code == 200:
            snap_gids = {s["group_id"] for s in resp.json()}
            if snap_gids.issubset(user_gids):
                results.ok("focus_snapshots SELECT: only own group")
            else:
                results.fail("focus_snapshots SELECT: only own group",
                           f"saw groups: {snap_gids - user_gids}")
    else:
        assert_rows("focus_snapshots SELECT all", resp, True)


def test_meetings(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test meetings table RLS."""
    print(f"\n--- meetings ({role}) ---")

    resp = client.select("meetings")
    if role == "team_member":
        user_gids = set(data["user_groups"].get(user_id, []))
        if resp.status_code == 200:
            mtg_gids = {m["group_id"] for m in resp.json()}
            if mtg_gids.issubset(user_gids):
                results.ok("meetings SELECT: only own group")
            else:
                results.fail("meetings SELECT: only own group",
                           f"saw groups: {mtg_gids - user_gids}")
    else:
        assert_rows("meetings SELECT all", resp, True)


def test_quarters(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test quarters table RLS."""
    print(f"\n--- quarters ({role}) ---")

    resp = client.select("quarters")
    assert_rows("quarters SELECT", resp, True)

    if role == "team_member":
        resp = client.insert("quarters", {"label": "RLS Test Q", "start_date": "2099-01-01", "end_date": "2099-03-31"})
        assert_status("quarters INSERT BLOCKED", resp, [403, 401])
    elif role == "system_admin":
        resp = client.insert("quarters", {"label": "RLS Test Q", "start_date": "2099-01-01", "end_date": "2099-03-31"})
        assert_status("quarters INSERT ALLOWED", resp, [201])
        if resp.status_code == 201:
            qid = resp.json()[0]["id"]
            client.delete("quarters", {"id": qid})


def test_rpc_start_new_week(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test start_new_week RPC authorization: p_user_id must match auth.uid()."""
    print(f"\n--- RPC: start_new_week ({role}) ---")

    other_user = None
    for p in data["profiles"]:
        if p["id"] != user_id:
            other_user = p
            break

    if other_user and data["user_groups"].get(user_id):
        resp = client.rpc("start_new_week", {
            "p_user_id": other_user["id"],
            "p_group_id": data["user_groups"][user_id][0],
            "p_new_week_date": "2099-01-06",
        })
        assert_status("start_new_week with other user_id BLOCKED", resp, [400, 403, 500])


def test_rpc_roll_forward_rock(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test roll_forward_rock RPC authorization."""
    print(f"\n--- RPC: roll_forward_rock ({role}) ---")

    if role != "team_member":
        print("  [SKIP] Only testing cross-group denial for team_member")
        return

    user_gids = set(data["user_groups"].get(user_id, []))
    other_rock = None
    for r in data["rocks"]:
        if r["group_id"] not in user_gids:
            other_rock = r
            break

    quarter = data["quarters"][0] if data["quarters"] else None
    if other_rock and quarter:
        resp = client.rpc("roll_forward_rock", {
            "p_rock_id": other_rock["id"],
            "p_new_quarter_id": quarter["id"],
        })
        assert_status("roll_forward_rock other group BLOCKED", resp, [400, 403, 500])
    else:
        print("  [SKIP] No cross-group rock found to test")


def test_rpc_promote_rock_idea(client: SupabaseClient, role: str, user_id: str, data: dict):
    """Test promote_rock_idea RPC authorization."""
    print(f"\n--- RPC: promote_rock_idea ({role}) ---")

    if role != "team_member":
        print("  [SKIP] Only testing cross-group denial for team_member")
        return

    user_gids = set(data["user_groups"].get(user_id, []))
    other_idea = None
    for ri in data.get("rock_ideas", []):
        if ri["group_id"] not in user_gids:
            other_idea = ri
            break

    quarter = data["quarters"][0] if data["quarters"] else None
    if other_idea and quarter:
        resp = client.rpc("promote_rock_idea", {
            "p_idea_id": other_idea["id"],
            "p_quarter_id": quarter["id"],
            "p_owner_id": user_id,
        })
        assert_status("promote_rock_idea other group BLOCKED", resp, [400, 403, 500])
    else:
        print("  [SKIP] No cross-group rock idea found to test")


# -- Main --

def run_tests_for_role(role: str, user: dict, data: dict):
    """Run all test suites for a given role."""
    print(f"\n{'='*50}")
    print(f"Testing as: {user['email']} ({role})")
    print(f"Groups: {data['user_groups'].get(user['id'], [])}")
    print(f"{'='*50}")

    session = get_user_token(user["email"])
    client = SupabaseClient(session["access_token"])

    data["_original_name"] = user["full_name"]

    test_profiles(client, role, user["id"], data)
    test_groups(client, role, user["id"], data)
    test_rocks(client, role, user["id"], data)
    test_issues(client, role, user["id"], data)
    test_focus(client, role, user["id"], data)
    test_meetings(client, role, user["id"], data)
    test_quarters(client, role, user["id"], data)
    test_rpc_start_new_week(client, role, user["id"], data)
    test_rpc_roll_forward_rock(client, role, user["id"], data)
    test_rpc_promote_rock_idea(client, role, user["id"], data)


def main():
    print("RLS Security Tests")
    print("=" * 50)

    data = discover_test_data()

    from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    data["_service_key"] = SUPABASE_SERVICE_ROLE_KEY
    data["_supabase_url"] = SUPABASE_URL

    roles_to_test = ["team_member", "system_admin"]

    exec_user = find_user_by_role(data["profiles"], "executive")
    if exec_user:
        roles_to_test.insert(1, "executive")

    for role in roles_to_test:
        user = find_user_by_role(data["profiles"], role)
        if not user:
            print(f"\n[SKIP] No user with role '{role}' found. "
                  f"Create one in admin panel or Supabase dashboard.")
            continue
        run_tests_for_role(role, user, data)

    all_passed = results.summary()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
