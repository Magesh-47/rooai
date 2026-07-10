"""
Roo AI — FastAPI backend

Start: uvicorn api:app --reload --port 8000
"""

import asyncio
import json
import os
import uuid
from pathlib import Path
from typing import AsyncGenerator

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse, Response, StreamingResponse
from gotrue.errors import AuthApiError
from pydantic import BaseModel, EmailStr
from supabase import Client, create_client

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

MS_CLIENT_ID     = os.getenv("MS_CLIENT_ID", "")
MS_CLIENT_SECRET = os.getenv("MS_CLIENT_SECRET", "")
MS_TENANT_ID     = os.getenv("MS_TENANT_ID", "common")
MS_REDIRECT_URI  = os.getenv("MS_REDIRECT_URI", "http://localhost:8000/integrations/teams/callback")
FRONTEND_URL     = os.getenv("FRONTEND_URL", "http://localhost:5173")

MS_SCOPES = "https://graph.microsoft.com/OnlineMeetings.Read https://graph.microsoft.com/User.Read offline_access"

admin_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

app = FastAPI(title="Roo AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory MCP session registry ───────────────────────
# { session_id: asyncio.Queue }
_mcp_sessions: dict[str, asyncio.Queue] = {}


# ── Pydantic models ───────────────────────────────────────

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


# ══════════════════════════════════════════════════════════
# Admin user endpoints
# ══════════════════════════════════════════════════════════

@app.get("/admin/users")
def list_users():
    result = admin_client.from_("profiles").select("*").order("created_at").execute()
    return result.data


@app.post("/admin/users", status_code=201)
def create_user(req: CreateUserRequest):
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
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
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
    try:
        admin_client.auth.admin.delete_user(user_id)
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ══════════════════════════════════════════════════════════
# Integrations — shared helpers
# ══════════════════════════════════════════════════════════

def _get_integration(type_: str) -> dict | None:
    result = (
        admin_client.from_("integrations")
        .select("*")
        .eq("type", type_)
        .maybe_single()
        .execute()
    )
    return result.data


def _upsert_integration(type_: str, config: dict, is_active: bool) -> dict:
    existing = _get_integration(type_)
    payload = {
        "type": type_,
        "config": config,
        "is_active": is_active,
        "connected_at": "now()" if is_active else None,
    }
    if existing:
        result = (
            admin_client.from_("integrations")
            .update(payload)
            .eq("type", type_)
            .execute()
        )
    else:
        result = admin_client.from_("integrations").insert(payload).execute()
    return result.data[0]


def _disconnect_integration(type_: str):
    admin_client.from_("integrations").update(
        {"is_active": False, "config": {}, "connected_at": None}
    ).eq("type", type_).execute()


# ══════════════════════════════════════════════════════════
# GET /integrations — status of all integrations
# ══════════════════════════════════════════════════════════

@app.get("/integrations")
def get_integrations():
    teams = _get_integration("teams")
    mcp   = _get_integration("mcp")

    return {
        "teams": {
            "connected": bool(teams and teams.get("is_active")),
            "configured": bool(MS_CLIENT_ID and MS_CLIENT_SECRET),
            "account": teams["config"].get("user_name") if teams and teams.get("is_active") else None,
            "tenant":  teams["config"].get("tenant_id") if teams and teams.get("is_active") else None,
            "connected_at": teams.get("connected_at") if teams else None,
        },
        "mcp": {
            "connected": True,
            "server_url": f"{os.getenv('MCP_BASE_URL', 'http://localhost:8000')}/mcp/sse",
            "connected_at": mcp.get("connected_at") if mcp else None,
        },
    }


# ══════════════════════════════════════════════════════════
# Microsoft Teams OAuth 2.0
# ══════════════════════════════════════════════════════════

def _teams_configured() -> bool:
    return bool(MS_CLIENT_ID and MS_CLIENT_SECRET)


@app.get("/integrations/teams/authorize")
def teams_authorize():
    if not _teams_configured():
        return HTMLResponse(_popup_html(
            success=False,
            message="Teams integration not configured. Set MS_CLIENT_ID and MS_CLIENT_SECRET in backend/.env",
        ))

    state = str(uuid.uuid4())
    auth_url = (
        f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/authorize"
        f"?client_id={MS_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={MS_REDIRECT_URI}"
        f"&scope={MS_SCOPES.replace(' ', '%20')}"
        f"&state={state}"
        f"&prompt=select_account"
    )
    return RedirectResponse(auth_url)


@app.get("/integrations/teams/callback")
async def teams_callback(code: str | None = None, error: str | None = None, error_description: str | None = None):
    if error or not code:
        return HTMLResponse(_popup_html(
            success=False,
            message=error_description or error or "Authorization cancelled",
        ))

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token",
            data={
                "client_id":     MS_CLIENT_ID,
                "client_secret": MS_CLIENT_SECRET,
                "code":          code,
                "redirect_uri":  MS_REDIRECT_URI,
                "grant_type":    "authorization_code",
                "scope":         MS_SCOPES,
            },
        )

    tokens = token_resp.json()
    if "error" in tokens:
        return HTMLResponse(_popup_html(success=False, message=tokens.get("error_description", "Token exchange failed")))

    # Fetch user info from Microsoft Graph
    async with httpx.AsyncClient() as client:
        me_resp = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
    me = me_resp.json()

    _upsert_integration("teams", {
        "access_token":  tokens["access_token"],
        "refresh_token": tokens.get("refresh_token", ""),
        "expires_in":    tokens.get("expires_in", 3600),
        "tenant_id":     MS_TENANT_ID,
        "user_name":     me.get("displayName", ""),
        "user_email":    me.get("mail") or me.get("userPrincipalName", ""),
    }, is_active=True)

    return HTMLResponse(_popup_html(
        success=True,
        account=me.get("displayName", ""),
    ))


@app.delete("/integrations/teams", status_code=204)
def teams_disconnect():
    _disconnect_integration("teams")


def _popup_html(success: bool, message: str = "", account: str = "") -> str:
    if success:
        payload = json.dumps({"type": "teams-auth-success", "account": account})
        body = f"""
          <p style="color:#16a34a;font-family:sans-serif;text-align:center;margin-top:60px">
            Connected as <strong>{account}</strong>. Closing…
          </p>
        """
    else:
        payload = json.dumps({"type": "teams-auth-error", "message": message})
        body = f"""
          <p style="color:#dc2626;font-family:sans-serif;text-align:center;margin-top:60px">
            {message}
          </p>
        """
    return f"""<!DOCTYPE html><html><body>
      {body}
      <script>
        try {{
          window.opener && window.opener.postMessage({payload}, '{FRONTEND_URL}');
        }} catch(e) {{}}
        setTimeout(() => window.close(), 1500);
      </script>
    </body></html>"""


# ══════════════════════════════════════════════════════════
# Claude MCP — SSE transport server
# ══════════════════════════════════════════════════════════

@app.get("/mcp/sse")
async def mcp_sse(request: Request):
    """SSE endpoint for the MCP transport. Claude Desktop connects here."""
    session_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    _mcp_sessions[session_id] = queue

    base = str(request.base_url).rstrip("/")
    message_url = f"{base}/mcp/message/{session_id}"

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            yield f"event: endpoint\ndata: {message_url}\n\n"
            while not await request.is_disconnected():
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(msg)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            _mcp_sessions.pop(session_id, None)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/mcp/message/{session_id}")
async def mcp_message(session_id: str, request: Request):
    """Receives JSON-RPC messages from Claude and routes responses back over SSE."""
    queue = _mcp_sessions.get(session_id)
    if queue is None:
        raise HTTPException(status_code=404, detail="MCP session not found")

    body = await request.json()
    response = await _handle_mcp(body)
    if response is not None:
        await queue.put(response)

    return Response(status_code=202)


async def _handle_mcp(body: dict) -> dict | None:
    method  = body.get("method", "")
    req_id  = body.get("id")          # None for notifications
    params  = body.get("params", {})

    # Notifications (no id) need no response
    if req_id is None:
        return None

    if method == "initialize":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "roo-ai", "version": "1.0.0"},
            },
        }

    if method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    if method == "tools/list":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"tools": _MCP_TOOLS},
        }

    if method == "tools/call":
        return await _mcp_tool_call(req_id, params)

    return {
        "jsonrpc": "2.0", "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


_MCP_TOOLS = [
    {
        "name": "list_meetings",
        "description": "List meetings in Roo. Returns title, date, status, summary, and participant count.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit":  {"type": "integer", "description": "Maximum results (default 20)"},
                "status": {"type": "string",  "enum": ["processing", "ready", "live"], "description": "Filter by status"},
            },
        },
    },
    {
        "name": "get_meeting",
        "description": "Get full details for a meeting including participants and log entries.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "meeting_id": {"type": "string", "description": "UUID of the meeting"},
            },
            "required": ["meeting_id"],
        },
    },
    {
        "name": "get_transcript",
        "description": "Get the full transcript of a meeting as ordered segments.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "meeting_id": {"type": "string", "description": "UUID of the meeting"},
            },
            "required": ["meeting_id"],
        },
    },
    {
        "name": "search_logs",
        "description": "Search log entries (actions, decisions, risks, architecture, culture) across all meetings.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query":  {"type": "string", "description": "Free-text search term"},
                "type":   {"type": "string", "enum": ["action", "decision", "architecture", "risk", "culture"]},
                "status": {"type": "string", "enum": ["open", "in-progress", "resolved"]},
            },
        },
    },
]


async def _mcp_tool_call(req_id: int | str, params: dict) -> dict:
    tool  = params.get("name", "")
    args  = params.get("arguments", {})

    def ok(data) -> dict:
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"content": [{"type": "text", "text": json.dumps(data, default=str, indent=2)}]},
        }

    def err(msg: str, code: int = -32603) -> dict:
        return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": msg}}

    try:
        if tool == "list_meetings":
            limit = int(args.get("limit", 20))
            q = (
                admin_client.from_("meetings")
                .select("id,title,date,status,summary,participant_count,duration")
                .order("date", desc=True)
                .limit(limit)
            )
            if "status" in args:
                q = q.eq("status", args["status"])
            return ok(q.execute().data)

        if tool == "get_meeting":
            mid = args.get("meeting_id")
            if not mid:
                return err("meeting_id is required", -32602)
            row = admin_client.from_("meetings").select("*").eq("id", mid).maybe_single().execute().data
            if not row:
                return err(f"Meeting {mid} not found", -32602)
            row["participants"] = admin_client.from_("meeting_participants").select("*").eq("meeting_id", mid).execute().data
            row["log_entries"]  = admin_client.from_("log_entries").select("*").eq("meeting_id", mid).execute().data
            return ok(row)

        if tool == "get_transcript":
            mid = args.get("meeting_id")
            if not mid:
                return err("meeting_id is required", -32602)
            segs = admin_client.from_("transcript_segments").select("*").eq("meeting_id", mid).order("seq_order").execute().data
            return ok(segs)

        if tool == "search_logs":
            q = admin_client.from_("log_entries").select("*,meetings(title,date)")
            text = args.get("query", "").strip()
            if text:
                q = q.or_(f"title.ilike.%{text}%,body.ilike.%{text}%")
            if "type" in args:
                q = q.eq("type", args["type"])
            if "status" in args:
                q = q.eq("status", args["status"])
            return ok(q.order("created_at", desc=True).limit(50).execute().data)

        return err(f"Unknown tool: {tool}", -32601)

    except Exception as exc:
        return err(str(exc))


# ══════════════════════════════════════════════════════════
# MCP status (for the integrations page)
# ══════════════════════════════════════════════════════════

@app.get("/integrations/mcp/status")
def mcp_status(request: Request):
    base = str(request.base_url).rstrip("/")
    return {
        "running": True,
        "server_url": f"{base}/mcp/sse",
        "active_sessions": len(_mcp_sessions),
    }


# ══════════════════════════════════════════════════════════
# Health
# ══════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok"}
