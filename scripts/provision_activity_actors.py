#!/usr/bin/env python3
"""Create restricted Immich activity accounts for recognised people.

Run without --apply to review all changes. With --apply, the script creates
accounts, adds them to every selected shared album, and writes a server-secret
actor registry. Never commit the generated JSON: it contains API key secrets.
"""

import argparse
import json
import os
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path


def request(base_url, api_key, method, path, body=None, bearer=None):
    headers = {"content-type": "application/json"}
    if bearer:
        headers["authorization"] = f"Bearer {bearer}"
    else:
        headers["x-api-key"] = api_key
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{base_url}/api{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read() or b"null")


def load_env(path):
    for line in Path(path).read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key, value)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default=".env")
    parser.add_argument("--album", action="append", dest="albums", help="Album ID to include (repeatable); defaults to all shared albums")
    parser.add_argument("--apply", action="store_true", help="Perform changes; otherwise print a dry run")
    parser.add_argument("--output", default=".immich-activity-actors.json")
    args = parser.parse_args()
    load_env(args.env_file)
    base_url, admin_key = os.environ.get("IMMICH_BASE_URL"), os.environ.get("API_KEY")
    if not base_url or not admin_key:
        sys.exit("IMMICH_BASE_URL and API_KEY are required")

    albums = args.albums or [album["id"] for album in request(base_url, admin_key, "GET", "/albums?isShared=true")]
    people = {}
    for album_id in albums:
        results = request(base_url, admin_key, "POST", "/search/metadata", {"albumIds": [album_id], "withPeople": True})
        for asset in results["assets"]["items"]:
            for person in asset.get("people") or []:
                people[person["id"]] = person

    planned = [{"id": "guest", "name": "Guest", "personId": None}]
    planned.extend({"id": f"person-{person_id}", "name": person["name"] or "Unnamed person", "personId": person_id} for person_id, person in people.items())
    print(f"{len(planned)} activity actors across {len(albums)} shared album(s):")
    for actor in planned:
        print(f"  - {actor['name']} ({actor['id']})")
    if not args.apply:
        print("\nDry run only. Re-run with --apply to create users and API keys.")
        return

    existing = request(base_url, admin_key, "GET", "/admin/users")
    existing_by_email = {user["email"]: user for user in existing}
    registry = []
    for actor in planned:
        email = f"activity-{actor['id']}@immich.local"
        password = secrets.token_urlsafe(24)
        user = existing_by_email.get(email)
        if not user:
            user = request(base_url, admin_key, "POST", "/admin/users", {
                "email": email, "name": actor["name"], "password": password,
                "notify": False, "shouldChangePassword": False, "quotaSizeInBytes": 0,
            })
        for album_id in albums:
            request(base_url, admin_key, "PUT", f"/albums/{album_id}/users", {"albumUsers": [{"userId": user["id"], "role": "viewer"}]})
        login = request(base_url, admin_key, "POST", "/auth/login", {"email": email, "password": password})
        key = request(base_url, admin_key, "POST", "/api-keys", {"name": "photo gallery activity", "permissions": ["activity.create"]}, login["accessToken"])
        registry.append({**actor, "apiKey": key["secret"]})

    Path(args.output).write_text(json.dumps(registry, indent=2) + "\n")
    print(f"\nWrote {args.output}. Store its JSON as the IMMICH_ACTIVITY_ACTORS Cloudflare secret, then delete the file.")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        sys.exit(f"Immich API request failed: {error.code} {error.read().decode()}")
