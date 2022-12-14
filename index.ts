
import { IMailAttachment, IMailObject, MailListener } from "./node_modules/mail-listener-typescript/dist/index";

const options = {
    username: "joost@jstdk.dev", // mail
    password: "iNUDd6ZduCrK", // pass
    host: 'imappro.zoho.com', // hot
    port: 993, // imap port
    tls: true, // tls
    connTimeout: 10000, // Default by node-imap
    authTimeout: 5000, // Default by node-imap,
    debug: console.log(), // Or your custom function with only one incoming argument. Default: null
    tlsOptions: { rejectUnauthorized: false },
    mailbox: "INBOX", // mailbox to monitor
    searchFilter: ["NEW"], // the search filter being used after an IDLE notification has been retrieved
    markSeen: false, // all fetched email will be marked as seen and not fetched next time
    fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
    mailParserOptions: { streamAttachments: true }, // options to be passed to mailParser lib.
    attachments: true, // get mail attachments as they are encountered
    attachmentOptions: {
        saveAttachments: false, // save attachments to the project directory
        directory: "attachments/", // folder on project directory to save attachements, will be created if not exists
        stream: true, // if it's enabled, will stream the attachments
    },
};

const MailListenerTS = new MailListener(options);

// Start
MailListenerTS.start();

// Simple example of how to get all attachments from an email
MailListenerTS.on("mail", async function (mail: IMailObject, seqno: any, attributes: any) {
    if (mail.attachments.length > 0) {
        var mailAttachments: IMailAttachment[] = []

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
            sender: mail.from.value[0].address,
            date: new Date(mail.date),
            files: mailAttachments
        }
        console.log(mailData)
    }
});

// Get erros
MailListenerTS.on("error", async function (error: any) {
    console.log("Mail listener Error", error);
});
