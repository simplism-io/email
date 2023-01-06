const { MailListener } = require("@dchicchon/mail-listener");

const supabase = require('./config.js');

var mailListeners = [];
var channelId;

async function setChannelId() {

    const { data, error } = await supabase
        .from('channels').select().eq('channel', 'email').single()

    if (data != null) {
        channelId = data.id
    }
    else {
        console.log('No channels found')
    }
}

async function start() {

    await setChannelId();

    const { data, error } = await supabase
        .from('mailboxes')
        .select()

    if (data != null) {
        data.forEach(createMailListener);
    }
    else {
        console.log('No mailboxes found')
    }
}

async function getEmailAddressId(email) {

    const { data, error } = await supabase
        .from('email_addresses')
        .eq('email', email)
        .select(id, customers(id))
        .single()

    console.log(data);

    if (data != null) {
        const { data, error } = await supabase
            .from('email_addresses')
            .insert({ email: email })
            .single()

        console.log(data);

        if (data != null) {
            return data.id
        }
        else {
            return null
        }
    }
    else {
        return data.id
    }

}

async function createMessage(mail, organisation_id) {

    const { data, error } = await supabase
        .from('messages')
        .insert({ organisation_id: organisation_id, channel_id: channelId, subject: mail.subject, body: mail.text, incoming: true })
        .single()

    console.log(data);

    if (data != null && error == null) {

        var result = await getEmailAddressId(mail.from);
        console.log(result)

        const { data, error } = await supabase
            .from('emails')
            .insert({ organisation_id: organisation_id, channel_id: channelId, subject: mail.subject, body: mail.text, incoming: true })
            .select()


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

function removeMailListener(mailbox) {
    mailListeners[mailbox.email].stop();
    delete mailListeners[mailbox.email];
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
        //attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
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

    mailListeners[mailbox.email].on("server:disconnected", function () {
        console.log("Imap Disconnected");
        // mailListeners[mailbox.email].stop();
        // createMailListener(mailbox)
    });

}

async function createMailBoxListener() {
    supabase
        .channel('public:mailboxes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mailboxes' }, async payload => {
            console.log('Mailbox list has been updated', payload)
            createMailListener(payload);
        })
        .subscribe()

    supabase
        .channel('public:mailboxes')
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mailboxes' }, async payload => {
            console.log('Mailbox list has been updated', payload)
            removeMailListener(payload);
        })
        .subscribe()

}

start();
//createMailBoxListener();