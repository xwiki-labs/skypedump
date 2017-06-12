const Sqlite3 = require('sqlite3').verbose();
const nThen = require('nthen');

const info = (ctx, cb) => {
    nThen((waitFor) => {
        ctx.db.each("SELECT name FROM sqlite_master WHERE type='table';", (err, row) => {
            console.log(row.name);
        }, waitFor());
    }).nThen((waitFor) => {
        console.log('\n\nChats:');
        ctx.db.each("PRAGMA table_info('Chats');", (err, row) => {
            console.log(row.name + '  ' + row.type);
        }, waitFor());
    }).nThen((waitFor) => {
        console.log('\n\nMessages');
        ctx.db.each("PRAGMA table_info('Messages');", (err, row) => {
            console.log(row.name + '  ' + row.type);
        }, waitFor());
    }).nThen((waitFor) => {
        console.log('\n\Contacts');
        ctx.db.each("PRAGMA table_info('Contacts');", (err, row) => {
            console.log(row.name + '  ' + row.type);
        }, waitFor());
    }).nThen((waitFor) => {
        cb();
    });
};

const chats = (ctx, private, cb) => {
    ctx.db.each("SELECT * FROM Chats;", (err, row) => {
        if (row.activemembers.split(' ').length < 3) {
            if (row.activemembers.split(' ').length < 2) { return; }
            if (!private) { return; }
        } else if (private) { return; }
        const name = row.topic || (row.activemembers.split(' ').map((x)=>(ctx.contactMap[x] || x)).join(', '));
        console.log(row.id + '  ' + name);
    }, cb);
};

const dumpChat = (ctx, id, handler, cb) => {
    let chatName;
    nThen((waitFor) => {
        ctx.db.each("SELECT * FROM Chats WHERE id = ?;", [id], (err, row) => {
            chatName = row.name;
        }, waitFor());
    }).nThen((waitFor) => {
        if (!chatName) {
            console.log("ERROR: No chat with ID " + id);
            return;
        }
        ctx.db.each("SELECT * FROM Messages WHERE chatname = ? ORDER BY timestamp__ms ASC;", [chatName], (err, row) => {
            if (!row.body_xml) { return; }
            handler(row);
        }, waitFor());
    }).nThen((waitFor) => {
        cb();
    })
};

const dumpContacts = (ctx, cb) => {
    const out = {};
    ctx.db.each("SELECT * FROM Contacts;", (err, row) => {
        if (!(row.firstname || row.lastname)) { return; }
        out[row.skypename] = (row.firstname + ' ' + row.lastname).trim();
    }, cb);
    return out;
};

const format = (msg) => {
    return msg
        .replace(/<[^>]*>/g, '')
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
    ;
};

const main = () => {
    const maindb = './main.db';
    let action;
    let number;
    let pvt = false;
    if (process.argv.indexOf('--rooms') > -1) {
        action = 'rooms';
    } else if (process.argv.indexOf('--privates') > -1) {
        action = 'rooms';
        pvt = true;
    } else if (process.argv.indexOf('--dump') > -1) {
        action = 'dump';
        number = process.argv[process.argv.indexOf('--dump') + 1];
    } else {
        console.log("Usage:");
        console.log("(First, COPY your skype main.db file into this directory)");
        console.log("Mac:     ~/Library/Application Support/Skype/<your skype name>/main.db");
        console.log("Windows: C:\\Users\\<you>\\AppData\\Local\\Packages\\Microsoft.SkypeApp_<some number>" +
            "\\LocalState\\<your skype name>\\main.db");
        console.log("node ./skypedump.js --rooms          ## List all rooms (id, name)");
        console.log("node ./skypedump.js --privates       ## List all private chats (id, members) EXPERIMENTAL");
        console.log("node ./skypedump.js --dump <number>  ## Dump all messages in a given room");
        return; 
    }
    const db = new Sqlite3.Database(maindb);
    const ctx = {
        db: db
    };
    nThen((waitFor) => {
        db.serialize(waitFor());
    }).nThen((waitFor) => {
        ctx.contactMap = dumpContacts(ctx, waitFor());
    }).nThen((waitFor) => {
        if (action !== 'rooms') { return; }
        chats(ctx, pvt, waitFor());
    }).nThen((waitFor) => {
        if (action !== 'dump') { return; }
        dumpChat(ctx, Number(number), (msg) => {
            console.log(new Date(msg.timestamp * 1000).toString().split(' ').slice(1, 5).join(' ') +
                ' ' + (ctx.contactMap[msg.author] || msg.author) +
                ': ' + format(msg.body_xml));
        }, waitFor());
    }).nThen((waitFor) => {
        db.close();
    });
};
main();