const { MailListener } = require("@dchicchon/mail-listener");
require('dotenv').config()
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.MODE == 'debug' ? process.env.SUPABASE_URL_DEBUG : process.env.SUPABASE_URL_PROD, process.env.MODE == 'debug' ? process.env.SUPABASE_KEY_DEBUG : process.env.SUPABASE_KEY_PROD)

var mailListeners = []

async function start() {
    const { data, error } = await supabase
        .from('mailboxes')
        .select()

    data.forEach(createMailListener);
}

async function createMessage(mail, organisation_id) {

    const { data, error } = await supabase
        .from('messages')
        .insert({ organisation_id: organisation_id, subject: mail.subject, body: mail.text })
        .select()

    if (data != null && error == null) {
        return data[0].id
    }
    else {
        return null
    }
}

async function saveAttachment(attachment, messageId) {

    var bufferToBase64 = attachment.toString('base64');

    const { data, error } = await supabase
        .from('attachments')
        .insert({ message_id: messageId, attachment: bufferToBase64 })
        .select()

    if (data != null && error == null) {
        return true;
    }
    else {
        return false;
    }

}

function createMailListener(mailbox) {

    mailListeners[mailbox.email] = new MailListener({
        username: mailbox.email, // mail
        password: mailbox.password, // pass
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
        fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
        attachments: false, // download attachments as they are encountered to the project directory
        attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
    });

    mailListeners[mailbox.email].start();

    mailListeners[mailbox.email].on("server:connected", function () {
        console.log("Connected to IMAP server");
    });

    mailListeners[mailbox.email].on("mail", async function (mail, seqno) {

        var messageId = await createMessage(mail, mailbox.organisation_id);

        if (messageId != null) {
            if (mail.attachments.length > 0) {
                for (let attachment of mail.attachments) {
                    console.log(attachment);
                    var resultSaveAttachment = await saveAttachment(attachment.content, messageId);
                    if (resultSaveAttachment == true) {
                        console.log('Transaction complete');
                    }
                }
            }
            else {
                console.log('Transaction complete');
            }
        }
    })

    mailListeners[mailbox.email].on("error", function (err) {
        console.log(err);
        // mailListeners[mailbox.email].stop();
        // createMailListener(mailbox)
    });

    // mailListeners[mailbox.email].on("server:disconnected", function () {
    //     console.log("imapDisconnected");
    //     mailListeners[mailbox.email].stop();
    //     createMailListener(mailbox)
    // });

}

async function createCloudListener() {
    supabase
        .channel('public:mailboxes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mailboxes' }, async payload => {
            console.log('Mailbox list has been updated', payload)
            createMailListener(payload);
        })
        .subscribe()
}

start();
createCloudListener();