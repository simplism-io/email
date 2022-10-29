import time
import socket
import imaplib
import traceback
from imap_tools import A, MailBox, MailboxLoginError, MailboxLogoutError

from dotenv import dotenv_values
from supabase import create_client, Client

config = dotenv_values(".env")
url: str = config['SUPABASE_URL']
key: str = config['SUPABASE_KEY']
supabase: Client = create_client(url, key)

done = False
while not done:
    connection_start_time = time.monotonic()
    connection_live_time = 0.0
    try:
        # emailAddresses = supabase.table("entries").select("*").execute()
        # assert len(emailAddresses.data) > 0
        # for emailAdress in emailAddresses.data:
        #    print('Checking email address: ' + emailAddress['email'])
        with MailBox('imap.gmail.com').login('joost.de.kruijff@flymya.co', 'xfwvmarwgsdtjdyh', 'INBOX') as mailbox:
            print('Imap poller started', time.asctime())
            while connection_live_time < 29 * 60:
                try:
                    responses = mailbox.idle.wait(timeout=3 * 60)
                    print(time.asctime(), 'IDLE responses:', responses)
                    if responses:
                        for msg in mailbox.fetch(A(seen=False)):
                            print('->', msg.date, msg.subject)
                            data = supabase.table("entries").insert(
                                {"entry": msg.subject}).execute()
                            assert len(data.data) > 0
                            print('New email stored in database')
                except KeyboardInterrupt:
                    print('~KeyboardInterrupt')
                    done = True
                    break
                connection_live_time = time.monotonic() - connection_start_time
    except (TimeoutError, ConnectionError,
            imaplib.IMAP4.abort, MailboxLoginError, MailboxLogoutError,
            socket.herror, socket.gaierror, socket.timeout) as e:
        print(
            f'## Error\n{e}\n{traceback.format_exc()}\nreconnect in a minute...')
        time.sleep(60)
