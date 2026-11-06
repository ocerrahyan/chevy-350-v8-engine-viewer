#!/usr/bin/env python3
"""Minimal IMAP email reader (standard library only).

Credentials come from environment variables, never from the source:
    EMAIL_ADDRESS   your address, e.g. you@gmail.com
    EMAIL_PASSWORD  an app password (NOT your normal password)
    IMAP_SERVER     optional, default imap.gmail.com

Examples:
    python read_email.py                      # 10 latest messages in INBOX
    python read_email.py --unread -n 20       # 20 latest unread
    python read_email.py --search 'FROM "boss@x.com"'
    python read_email.py --read 4821          # show full body of message id 4821
    python read_email.py --list-folders
"""
import argparse
import email
import imaplib
import os
import sys
from email.header import decode_header, make_header
from email.message import Message


def dh(value: str | None) -> str:
    """Decode an RFC 2047 encoded header."""
    if not value:
        return ""
    return str(make_header(decode_header(value)))


def connect() -> imaplib.IMAP4_SSL:
    user = os.environ.get("EMAIL_ADDRESS")
    pw = os.environ.get("EMAIL_PASSWORD")
    server = os.environ.get("IMAP_SERVER", "imap.gmail.com")
    if not user or not pw:
        sys.exit("Set EMAIL_ADDRESS and EMAIL_PASSWORD (use an app password).")
    conn = imaplib.IMAP4_SSL(server)
    conn.login(user, pw)
    return conn


def body_text(msg: Message) -> str:
    """Prefer text/plain; fall back to text/html with tags stripped."""
    html = None
    for part in msg.walk():
        if part.get_content_maintype() == "multipart":
            continue
        if part.get_filename():  # attachment
            continue
        payload = part.get_payload(decode=True)
        if payload is None:
            continue
        text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
        if part.get_content_type() == "text/plain":
            return text
        if part.get_content_type() == "text/html" and html is None:
            html = text
    if html:
        import re
        return re.sub(r"<[^>]+>", "", html)
    return "(no text body)"


def fetch(conn, msg_id: bytes, headers_only: bool) -> Message:
    spec = "(BODY.PEEK[HEADER])" if headers_only else "(BODY.PEEK[])"  # PEEK: don't mark read
    status, data = conn.fetch(msg_id, spec)
    if status != "OK":
        sys.exit(f"Fetch failed for {msg_id!r}")
    return email.message_from_bytes(data[0][1])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-f", "--folder", default="INBOX")
    ap.add_argument("-n", "--count", type=int, default=10)
    ap.add_argument("--unread", action="store_true", help="only unread messages")
    ap.add_argument("--search", help='raw IMAP search, e.g. \'FROM "bob" SINCE 01-Nov-2026\'')
    ap.add_argument("--read", metavar="ID", help="print the full message with this id")
    ap.add_argument("--list-folders", action="store_true")
    args = ap.parse_args()

    conn = connect()
    try:
        if args.list_folders:
            for f in conn.list()[1]:
                print(f.decode())
            return

        conn.select(f'"{args.folder}"', readonly=True)

        if args.read:
            msg = fetch(conn, args.read.encode(), headers_only=False)
            print(f"From:    {dh(msg['From'])}\nTo:      {dh(msg['To'])}\n"
                  f"Date:    {msg['Date']}\nSubject: {dh(msg['Subject'])}\n")
            print(body_text(msg))
            atts = [dh(p.get_filename()) for p in msg.walk() if p.get_filename()]
            if atts:
                print("\nAttachments:", ", ".join(atts))
            return

        criteria = args.search or ("UNSEEN" if args.unread else "ALL")
        status, data = conn.search(None, criteria)
        if status != "OK":
            sys.exit("Search failed")
        ids = data[0].split()[-args.count:][::-1]  # newest first
        if not ids:
            print("No messages.")
            return
        for i in ids:
            m = fetch(conn, i, headers_only=True)
            print(f"[{i.decode():>6}] {m['Date'] or '':<32.32} {dh(m['From']):<35.35} {dh(m['Subject'])}")
    finally:
        try:
            conn.close()
        except imaplib.IMAP4.error:
            pass
        conn.logout()


if __name__ == "__main__":
    main()
