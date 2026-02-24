"""
Supabase REST Client for RLS Testing
=====================================
Authenticates as different users via generate_link and provides
a REST client that mirrors how the app calls PostgREST.
"""

import requests
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY


def get_user_token(email: str) -> dict:
    """
    Generate magic link + verify to get session tokens.
    Returns dict with {access_token, refresh_token, user}.
    """
    admin_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    # Generate magic link
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        headers=admin_headers,
        json={"type": "magiclink", "email": email},
    )
    resp.raise_for_status()
    hashed_token = resp.json()["hashed_token"]

    # Verify to get session
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/verify",
        headers={"apikey": SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json"},
        json={"type": "magiclink", "token_hash": hashed_token},
    )
    resp.raise_for_status()
    return resp.json()


class SupabaseClient:
    """REST client that calls PostgREST with a user's JWT (same path as the app)."""

    def __init__(self, access_token: str):
        self.headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self.base = f"{SUPABASE_URL}/rest/v1"

    def select(self, table: str, select: str = "*", params: dict = None) -> requests.Response:
        """GET request (SELECT). Returns raw Response for status code inspection."""
        url = f"{self.base}/{table}?select={select}"
        if params:
            for k, v in params.items():
                url += f"&{k}={v}"
        return requests.get(url, headers=self.headers)

    def insert(self, table: str, data: dict) -> requests.Response:
        """POST request (INSERT)."""
        return requests.post(f"{self.base}/{table}", headers=self.headers, json=data)

    def update(self, table: str, data: dict, match: dict) -> requests.Response:
        """PATCH request (UPDATE)."""
        url = f"{self.base}/{table}"
        for k, v in match.items():
            url += f"?{k}=eq.{v}"
        return requests.patch(url, headers=self.headers, json=data)

    def delete(self, table: str, match: dict) -> requests.Response:
        """DELETE request."""
        url = f"{self.base}/{table}"
        for k, v in match.items():
            url += f"?{k}=eq.{v}"
        return requests.delete(url, headers=self.headers)

    def rpc(self, function_name: str, params: dict) -> requests.Response:
        """POST to /rpc/ endpoint."""
        return requests.post(
            f"{self.base}/rpc/{function_name}",
            headers=self.headers,
            json=params,
        )


def admin_query(table: str, select: str = "*", params: str = "") -> list:
    """Query using service role key (bypasses RLS)."""
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}"
    if params:
        url += f"&{params}"
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()


def admin_update(table: str, data: dict, match: dict) -> requests.Response:
    """Update using service role key (bypasses RLS). For test setup/teardown."""
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    for k, v in match.items():
        url += f"?{k}=eq.{v}"
    return requests.patch(url, headers=headers, json=data)
