const { MailListener } = require("@dchicchon/mail-listener");
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.MODE == 'debug' ? process.env.SUPABASE_URL_DEBUG : process.env.SUPABASE_URL_PROD, process.env.MODE == 'debug' ? process.env.SUPABASE_KEY_DEBUG : process.env.SUPABASE_KEY_PROD)


function createMailListener(mailbox) {


    var mailListener[mailbox.email] = new MailListener({
        username: "joost@jstdk.dev", // mail
        password: process.env.TEMP_PASSWORD, // pass
        host: 'imappro.zoho.com',
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
        attachments: true, // download attachments as they are encountered to the project directory
        attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
    });

    mailListener.start();

}

async function getMailBoxes() {
    const { data, error } = await supabase
        .from('mailboxes')
        .select()

    console.log(data);

    return data
}

async function main() {

    //getMailBoxes()
    //createMailListeners()

    //CREATE CONNECTIONS FOR EXISTING MAILBOXES

    supabase
        .channel('public:mailboxes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mailboxes' }, async payload => {
            console.log('Change received!', payload)

            const { data, error } = await supabase
                .from('mailboxes')
                .select()

            console.log(data);
            //createNewMailListener()


            //CREATE CONNECTION FOR NEW MAILBOX


        })
        .subscribe()
}


// }
var mailboxes = await getMailBoxes();

mailboxes.forEach(createMailListener);


main();
// start listening

// stop listening
//mailListener.stop();

// Simple example of how to get all attachments from an email
// mailListenerTS1.on("mail", async function (mail: IMailObject, seqno: any, attributes: any) {
//     if (mail.attachments.length > 0) {
//         var mailAttachments: IMailAttachment[] = []

//         for (let attachment of mail.attachments) {
//             mailAttachments.push(attachment)
//         }
//         let mailData = {
//             name: mail.from.value[0].name,
//             sender: mail.from.value[0].address,
//             date: new Date(mail.date),
//             files: mailAttachments
//         }
//         console.log(mailData)
//     }
//     else {
//         let mailData = {
//             name: mail.from.value[0].name,
//             body: mail.text,
//             sender: mail.from.value[0].address,
//             date: new Date(mail.date),
//             files: mailAttachments
//         }
//         console.log(mailData)
//     }
// });

// mailListener.on("server:connected", function () {
//     console.log("imapConnected");
// });

// mailListener.on("mailbox", function (mailbox) {
//     console.log("Total number of mails: ", mailbox.messages.total); // this field in mailbox gives the total number of emails
// });

// mailListener.on("server:disconnected", function () {
//     console.log("imapDisconnected");
// });

mailListener.on("error", function (err) {
    console.log(err);
});

// mailListener.on("headers", function (headers, seqno) {
//     // do something with mail headers
// });

// mailListener.on("body", function (body, seqno) {
//     // do something with mail body
// })

// mailListener.on("attachment", function (attachment, path, seqno) {
//     // do something with attachment
// });

mailListener.on("mail", function (mail, seqno) {

    if (mail.attachments.length > 0) {
        var mailAttachments = []

        for (let attachment of mail.attachments) {
            mailAttachments.push(attachment)
        }
        let mailData = {
            name: mail.from.value[0].name,
            sender: mail.from.value[0].address,
            date: new Date(mail.date),
            files: mailAttachments
        }
        console.log(mailData)
    }
    else {
        let mailData = {
            name: mail.from.value[0].name,
            body: mail.text,
            sender: mail.from.value[0].address,
            date: new Date(mail.date),
            files: mailAttachments
        }
        console.log(mailData)
    }

})
