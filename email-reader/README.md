# Email reader

Read-only IMAP command-line reader. Python 3.10+, no dependencies.

## Setup (Gmail)
1. Turn on 2-Step Verification on your Google account.
2. Create an app password at https://myaccount.google.com/apppasswords
3. Export credentials (don't commit them):

```bash
export EMAIL_ADDRESS=you@gmail.com
export EMAIL_PASSWORD='xxxx xxxx xxxx xxxx'
# other providers: export IMAP_SERVER=outlook.office365.com  (or imap.mail.yahoo.com)
```

## Usage
```bash
python read_email.py                  # latest 10
python read_email.py --unread -n 20
python read_email.py --search 'FROM "alice" SINCE 01-Nov-2026'
python read_email.py --read 4821      # full body of message id 4821
python read_email.py --list-folders
```

Messages are fetched with `BODY.PEEK` and the folder is opened read-only, so nothing gets marked as read.
