import os, sys
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
from gotrue.errors import AuthApiError

client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

try:
    res = client.auth.admin.create_user({
        "email": "Sridhar@PointOneZero.com",
        "password": "poz123",
        "email_confirm": True,
        "user_metadata": {"name": "Sridhar", "role": "admin"},
    })
    uid = res.user.id
    print(f"Auth user created: {uid}")

    client.from_("profiles").upsert({
        "id": uid,
        "name": "Sridhar",
        "email": "Sridhar@PointOneZero.com",
        "role": "admin",
        "department": "Management",
    }).execute()
    print("Profile upserted with role=admin")
    print("Done.")
except AuthApiError as e:
    print(f"Error: {e}")
