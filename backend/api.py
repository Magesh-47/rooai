"""
Roo AI — FastAPI backend
Admin user management + future endpoints (transcription, reconciliation)

Start: uvicorn api:app --reload --port 8000
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client
from gotrue.errors import AuthApiError

load_dotenv()

SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Service-role client — admin privileges, backend only
admin_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

app = FastAPI(title="Roo AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "employee"
    department: str = ""

class UpdateUserRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    department: str | None = None
    is_active: bool | None = None


# ── Admin user endpoints ──────────────────────────────────

@app.get("/admin/users")
def list_users():
    """Return all users with their profile data."""
    result = admin_client.from_("profiles").select("*").order("created_at").execute()
    return result.data


@app.post("/admin/users", status_code=201)
def create_user(req: CreateUserRequest):
    """Create a new Supabase auth user + profile."""
    try:
        res = admin_client.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {"name": req.name, "role": req.role},
        })
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user_id = res.user.id

    # Upsert profile (trigger may have already inserted it)
    admin_client.from_("profiles").upsert({
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "role": req.role,
        "department": req.department or None,
    }).execute()

    return {"id": user_id, "email": req.email}


@app.patch("/admin/users/{user_id}")
def update_user(user_id: str, req: UpdateUserRequest):
    """Update profile fields (name, role, department, is_active)."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    # Sync name into auth metadata if provided
    if "name" in updates:
        admin_client.auth.admin.update_user_by_id(
            user_id, {"user_metadata": {"name": updates["name"]}}
        )

    result = (
        admin_client.from_("profiles")
        .update(updates)
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@app.delete("/admin/users/{user_id}", status_code=204)
def delete_user(user_id: str):
    """Permanently delete a user (auth + profile)."""
    try:
        admin_client.auth.admin.delete_user(user_id)
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Health check ──────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}
