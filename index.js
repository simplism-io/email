const { MailListener } = require("@dchicchon/mail-listener");
require('dotenv').config()
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.MODE == 'debug' ? process.env.SUPABASE_URL_DEBUG : process.env.SUPABASE_URL_PROD, process.env.MODE == 'debug' ? process.env.SUPABASE_KEY_DEBUG : process.env.SUPABASE_KEY_PROD)


var mailListeners = []


async function createMessage(mail) {
    const { error } = await supabase
        .from('messages')
        .insert({ title: mail.title, body: mail.body })

    //RETRIEVE MESSAGE ID

    if (error.status == 200) {
        return true
    }
    else {
        return false
    }
}

async function storeAttachments(messageId, url) {
    const { error } = await supabase
        .from('attachments')
        .insert({ message_id: messageId, url: url })

    if (error.status == 200) {
        return true
    }
    else {
        return false
    }
}

function deleteLocalAttachment(file) {
    fs.unlink('attachments/${file}', err => {
        if (err) {
            throw err
        }

        console.log('File is deleted.')
    })
}


function createMailListener(mailbox) {

    mailListeners[mailbox.email] = new MailListener({
        username: mailbox.email, // mail
        password: process.env.TEMP_PASSWORD, // pass
        host: mailbox.host,
        port: 993, // imap port
        tls: true,
        connTimeout: 10000, // Default by node-imap
        authTimeout: 5000, // Default by node-imap,
        debug: console.log, // Or your custom function with only one incoming argument. Default: null
        tlsOptions: { rejectUnauthorized: false },
        mailbox: "INBOX", // mailbox to monitor
        searchFilter: ["NEW"], // the search filter being used after an IDLE notification has been retrieved
        markSeen: true, // all fetched email willbe marked as seen and not fetched next time
        fetchUnreadOnStart: false, // use it only if you want to get all unread email on lib start. Default is `false`,
        attachments: true, // download attachments as they are encountered to the project directory
        attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
    });

    mailListeners[mailbox.email].start();

    mailListeners[mailbox.email].on("server:connected", function () {
        console.log("imapConnected");
    });

    mailListeners[mailbox.email].on("mail", async function (mail, seqno) {

        var messageId = createMessage(mailData);

        if (messageId != null) {

            if (mail.attachments.length > 0) {
                for (let attachment of mail.attachments) {
                    resultStoreAttachments = await storeAttachments(attachment, messageId);
                    if (resultStoreAttachments == true) {
                        deleteLocalAttachment(attachment);
                        console.log('Main successfully stores')
                    }
                }
            }
        }
    })

    mailListeners[mailbox.email].on("error", function (err) {
        console.log(err);
        mailListeners[mailbox.email].stop();
        createMailListener(mailbox)
    });

    mailListeners[mailbox.email].on("server:disconnected", function () {
        console.log("imapDisconnected");
        mailListeners[mailbox.email].stop();
        createMailListener(mailbox)
    });

}

async function getMailBoxes() {
    const { data, error } = await supabase
        .from('mailboxes')
        .select()
    console.log(data);
    return data
}

async function createMailboxListListener() {
    supabase
        .channel('public:mailboxes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mailboxes' }, async payload => {
            console.log('Mailbox list has been updated', payload)
            createNewMailListener(payload);
        })
        .subscribe()
}

var mailboxes = await getMailBoxes();
mailboxes.forEach(createMailListener);
createMailboxListListener();