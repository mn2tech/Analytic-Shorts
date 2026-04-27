"""
╔══════════════════════════════════════════════════════╗
║        INNSOFT → YOUR PMS MIGRATION TOOL             ║
║  Reverse-engineered from Gateway Inn TODAY.DTA data  ║
╚══════════════════════════════════════════════════════╝

Usage:
    python innsoft_migrator.py --zip 2026-04-22.ZIP
    python innsoft_migrator.py --file TODAY.DTA
    python innsoft_migrator.py --zip backup.ZIP --supabase --url YOUR_URL --key YOUR_KEY

Output:
    - gateway_inn_rooms.json     (room data)
    - gateway_inn_guests.json    (guest data)
    - gateway_inn_import.sql     (SQL for Supabase)
"""

import struct
import json
import zipfile
import argparse
import os
import sys
from datetime import datetime


# ─────────────────────────────────────────────
#  Binary Parser Functions
# ─────────────────────────────────────────────

def read_utf16_string(data: bytes, offset: int) -> str:
    """
    Read a Pascal-style UTF-16 LE string from Innsoft binary data.
    Format: 2-byte little-endian length + UTF-16-LE encoded characters
    """
    try:
        if offset + 2 > len(data):
            return ""
        length = struct.unpack_from('<H', data, offset)[0]
        if length == 0 or length > 200:
            return ""
        end = offset + 2 + length * 2
        if end > len(data):
            return ""
        text = data[offset + 2:end].decode('utf-16-le', errors='ignore')
        # Only keep printable ASCII-range characters
        if all(32 <= ord(c) < 200 for c in text):
            return text.strip()
        return ""
    except Exception:
        return ""


def parse_guest_blocks(data: bytes) -> dict:
    """
    Parse guest records from TODAY.DTA.
    Guest records are 3000 bytes each, starting at offset 0.
    Total: 19 records × 3000 bytes = 57000 bytes
    """
    guests = {}
    for base in range(0, 57000, 3000):
        if base + 1000 > len(data):
            break

        first_name = read_utf16_string(data, base + 106)
        last_name = read_utf16_string(data, base + 158)
        if not first_name or not last_name:
            continue

        key = f"{last_name}, {first_name}"
        rate_str = read_utf16_string(data, base + 768)

        guests[key] = {
            "first_name": first_name,
            "last_name": last_name,
            "source": read_utf16_string(data, base + 210),
            "address": read_utf16_string(data, base + 292),
            "city": read_utf16_string(data, base + 496),
            "state": read_utf16_string(data, base + 548),
            "country": read_utf16_string(data, base + 560),
            "zip": read_utf16_string(data, base + 612),
            "phone": read_utf16_string(data, base + 634),
            "email": read_utf16_string(data, base + 666),
            "rate": float(rate_str) if rate_str else 0.0,
            "check_in": read_utf16_string(data, base + 688),
            "check_out": read_utf16_string(data, base + 710),
            "room_number": read_utf16_string(data, base + 744),
            "booking_ref": read_utf16_string(data, base + 909) if base + 909 < len(data) else "",
        }
    return guests


def parse_room_map(data: bytes, guests: dict) -> list:
    """
    Parse room status map from TODAY.DTA.
    Room records start at offset 55000, 1000 bytes each.
    """
    rooms = []
    for base in range(55000, len(data) - 300, 1000):
        room_num = read_utf16_string(data, base + 106)
        room_type = read_utf16_string(data, base + 116)
        guest_name = read_utf16_string(data, base + 180)
        unavail_dt = read_utf16_string(data, base + 158)

        if not room_num or not room_num.isdigit():
            continue
        room_int = int(room_num)
        if room_int < 100 or room_int > 999:
            continue

        guest_data = guests.get(guest_name)
        is_unavail = bool(unavail_dt and '/' in unavail_dt)

        if guest_name and guest_data:
            status = "occupied"
        elif is_unavail:
            status = "unavailable"
        else:
            status = "available"

        rooms.append({
            "room_number": room_num,
            "room_type": room_type,
            "status": status,
            "guest_name": guest_name or None,
            "unavail_until": unavail_dt if is_unavail else None,
            "guest": guest_data,
        })

    return sorted(rooms, key=lambda r: int(r["room_number"]))


def parse_today_dta(data: bytes) -> dict:
    """Main parser entry point for TODAY.DTA binary data."""
    print("  Parsing guest records...")
    guests = parse_guest_blocks(data)
    print(f"  Found {len(guests)} guests")

    print("  Parsing room map...")
    rooms = parse_room_map(data, guests)
    print(f"  Found {len(rooms)} rooms")

    return {"rooms": rooms, "guests": list(guests.values())}


def extract_today_dta_from_zip(zip_path: str) -> bytes:
    """Extract and return TODAY.DTA bytes from an Innsoft backup ZIP."""
    with zipfile.ZipFile(zip_path, 'r') as zf:
        # Case-insensitive search for TODAY.DTA
        names = zf.namelist()
        match = next((n for n in names if n.upper().endswith("TODAY.DTA")), None)
        if not match:
            raise FileNotFoundError(
                "TODAY.DTA not found in ZIP.\n"
                f"Files in ZIP: {', '.join(names[:10])}..."
            )
        print(f"  Found: {match}")
        return zf.read(match)


# ─────────────────────────────────────────────
#  Export Functions
# ─────────────────────────────────────────────

def export_json(data: dict, output_dir: str = "."):
    """Export parsed data to JSON files."""
    rooms_file = os.path.join(output_dir, "gateway_inn_rooms.json")
    guests_file = os.path.join(output_dir, "gateway_inn_guests.json")

    with open(rooms_file, 'w') as f:
        json.dump(data["rooms"], f, indent=2)
    with open(guests_file, 'w') as f:
        json.dump(data["guests"], f, indent=2)

    print(f"\n  ✅ Rooms JSON:  {rooms_file}")
    print(f"  ✅ Guests JSON: {guests_file}")


def export_sql(data: dict, output_dir: str = "."):
    """Generate SQL INSERT statements for Supabase/PostgreSQL."""
    sql_file = os.path.join(output_dir, "gateway_inn_import.sql")

    with open(sql_file, 'w') as f:
        f.write("-- ─────────────────────────────────────────\n")
        f.write("-- Gateway Inn Innsoft Migration SQL\n")
        f.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- ─────────────────────────────────────────\n\n")

        # Rooms table
        f.write("-- ROOMS\n")
        f.write("INSERT INTO rooms (room_number, room_type, status) VALUES\n")
        room_values = []
        for r in data["rooms"]:
            status = r["status"] if r["status"] != "unavailable" else "maintenance"
            room_values.append(
                f"  ('{r['room_number']}', '{r['room_type'].replace(chr(39), chr(39) * 2)}', '{status}')"
            )
        f.write(",\n".join(room_values) + "\n")
        f.write("ON CONFLICT (room_number) DO UPDATE SET\n")
        f.write("  room_type = EXCLUDED.room_type,\n")
        f.write("  status = EXCLUDED.status;\n\n")

        # Guests table
        f.write("-- GUESTS\n")
        for g in data["guests"]:
            def esc(s):
                return str(s or "").replace("'", "''")
            f.write(
                f"INSERT INTO guests "
                f"(first_name, last_name, email, phone, address, city, state, zip, country) "
                f"VALUES ("
                f"'{esc(g['first_name'])}', '{esc(g['last_name'])}', "
                f"'{esc(g['email'])}', '{esc(g['phone'])}', "
                f"'{esc(g['address'])}', '{esc(g['city'])}', "
                f"'{esc(g['state'])}', '{esc(g['zip'])}', '{esc(g['country'])}'"
                f") ON CONFLICT (email) DO NOTHING;\n"
            )

        # Reservations for occupied rooms
        f.write("\n-- RESERVATIONS (current occupied rooms)\n")
        for g in data["guests"]:
            if not g.get("room_number"):
                continue

            def esc(s):
                return str(s or "").replace("'", "''")

            check_in = g.get("check_in", "").replace("/", "-") if g.get("check_in") else "NULL"
            check_out = g.get("check_out", "").replace("/", "-") if g.get("check_out") else "NULL"
            rate = g.get("rate", 0)

            f.write(
                f"INSERT INTO reservations "
                f"(guest_id, room_id, check_in_date, check_out_date, rate_per_night, status, source) "
                f"SELECT g.id, r.id, "
                f"{'NULL' if check_in == 'NULL' else repr(check_in)}, "
                f"{'NULL' if check_out == 'NULL' else repr(check_out)}, "
                f"{rate}, 'checked_in', '{esc(g.get('source', 'Walk-in'))}' "
                f"FROM guests g, rooms r "
                f"WHERE g.last_name = '{esc(g['last_name'])}' "
                f"AND g.first_name = '{esc(g['first_name'])}' "
                f"AND r.room_number = '{g['room_number']}' "
                f"ON CONFLICT DO NOTHING;\n"
            )

    print(f"  ✅ SQL File:    {sql_file}")


def print_summary(data: dict):
    """Print a pretty summary of imported data."""
    rooms = data["rooms"]
    guests = data["guests"]

    occ = sum(1 for r in rooms if r["status"] == "occupied")
    avl = sum(1 for r in rooms if r["status"] == "available")
    una = sum(1 for r in rooms if r["status"] == "unavailable")
    occ_rate = occ / (occ + avl) * 100 if (occ + avl) > 0 else 0
    avg_rate = sum(g.get("rate", 0) for g in guests) / max(len(guests), 1)

    sources = {}
    for g in guests:
        src = g.get("source", "Unknown") or "Unknown"
        sources[src] = sources.get(src, 0) + 1

    print("\n" + "═" * 55)
    print("  GATEWAY INN — LIVE DATA SUMMARY")
    print("═" * 55)
    print(f"  📅 Date:          {datetime.now().strftime('%B %d, %Y')}")
    print(f"  🏨 Total Rooms:   {len(rooms)}")
    print(f"  🔴 Occupied:      {occ}  ({occ_rate:.1f}% occupancy)")
    print(f"  🟢 Available:     {avl}")
    print(f"  ⚫ Unavailable:   {una}")
    print(f"  👤 Guests:        {len(guests)}")
    print(f"  💰 Avg Rate:      ${avg_rate:.2f}/night")
    print(f"  💵 Daily Revenue: ${sum(g.get('rate', 0) for g in guests):.2f}")

    print("\n  BOOKING SOURCES:")
    for src, count in sorted(sources.items(), key=lambda x: -x[1]):
        bar = "█" * count
        print(f"    {src:<25} {bar} ({count})")

    print("\n  ROOM STATUS:")
    for r in rooms:
        status_icon = {"occupied": "🔴", "available": "🟢", "unavailable": "⚫"}.get(r["status"], "⚪")
        guest_info = ""
        if r["guest"]:
            g = r["guest"]
            guest_info = f" → {g['first_name']} {g['last_name']} (${g['rate']}/night)"
        elif r["unavail_until"]:
            guest_info = f" → Until {r['unavail_until']}"
        print(f"    {r['room_number']} [{r['room_type']:20s}] {status_icon}{guest_info}")
    print("═" * 55)


# ─────────────────────────────────────────────
#  Main Entry Point
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Migrate Innsoft Check-Inn data to your PMS database"
    )
    parser.add_argument("--zip", help="Path to Innsoft backup ZIP file (e.g. 2026-04-22.ZIP)")
    parser.add_argument("--file", help="Path to TODAY.DTA file directly")
    parser.add_argument("--out", default=".", help="Output directory for exported files")
    parser.add_argument("--supabase", action="store_true", help="Push directly to Supabase")
    parser.add_argument("--url", help="Supabase project URL")
    parser.add_argument("--key", help="Supabase service role key")
    args = parser.parse_args()

    if not args.zip and not args.file:
        print("❌ Error: Provide either --zip or --file")
        print("Example: python innsoft_migrator.py --zip 2026-04-22.ZIP")
        sys.exit(1)

    print("\n╔══════════════════════════════════════════╗")
    print("║    Innsoft → PMS Migration Tool          ║")
    print("╚══════════════════════════════════════════╝\n")

    # Read the data
    try:
        if args.zip:
            print(f"📂 Reading ZIP: {args.zip}")
            today_data = extract_today_dta_from_zip(args.zip)
        else:
            print(f"📂 Reading: {args.file}")
            with open(args.file, 'rb') as f:
                today_data = f.read()

        print(f"  File size: {len(today_data):,} bytes")
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        sys.exit(1)

    # Parse
    print("\n⚙️  Parsing binary data...")
    try:
        data = parse_today_dta(today_data)
    except Exception as e:
        print(f"❌ Parse error: {e}")
        sys.exit(1)

    # Print summary
    print_summary(data)

    # Export files
    print("\n📤 Exporting data...")
    os.makedirs(args.out, exist_ok=True)
    export_json(data, args.out)
    export_sql(data, args.out)

    # Optional: push to Supabase
    if args.supabase:
        if not args.url or not args.key:
            print("\n⚠️  Supabase push requires --url and --key")
        else:
            try:
                push_to_supabase(data, args.url, args.key)
            except ImportError:
                print("\n⚠️  Install supabase-py: pip install supabase")

    print("\n✅ Migration complete! Next steps:")
    print("   1. Run the SQL file in your Supabase SQL editor")
    print("   2. Or use the JSON files to import via your API")
    print("   3. Your room map will update automatically")
    print()


def push_to_supabase(data: dict, url: str, key: str):
    """Push parsed data directly to Supabase."""
    from supabase import create_client

    print("\n🔗 Connecting to Supabase...")
    supabase = create_client(url, key)

    print("  Inserting rooms...")
    for room in data["rooms"]:
        status = room["status"] if room["status"] != "unavailable" else "maintenance"
        supabase.table("rooms").upsert({
            "room_number": room["room_number"],
            "room_type": room["room_type"],
            "status": status,
        }, on_conflict="room_number").execute()

    print("  Inserting guests...")
    for guest in data["guests"]:
        if guest.get("email"):
            supabase.table("guests").upsert({
                "first_name": guest["first_name"],
                "last_name": guest["last_name"],
                "email": guest["email"],
                "phone": guest.get("phone", ""),
                "address": guest.get("address", ""),
                "city": guest.get("city", ""),
                "state": guest.get("state", ""),
            }, on_conflict="email").execute()

    print("  ✅ Supabase import complete!")


if __name__ == "__main__":
    main()
