const https = require('https');
const fs = require('fs');

const commander = require('commander');
const promisfy = require('promisfy');

const connect = promisfy.promisfyNoError(https.get, https);
const readfile = promisfy.promisfy(fs.readFile);
const writefile = promisfy.promisfy(fs.writeFile);

function base64ToString(str) {
    return Buffer.from(str, 'base64').toString();
}

function processGfwRawData(gfwraw) {
    let list = base64ToString(gfwraw).split('\n').filter((val , i) => {
        if (val.startsWith('[') || val.startsWith('!') || val.length === 0) {
            return false;
        }

        return true;
    });

    return list;
}

async function main(proxy, useTiny) {
    let gfwurl;

    if (useTiny) {
        gfwurl = 'https://raw.githubusercontent.com/gfwlist/tinylist/master/tinylist.txt';
    } else {
        gfwurl = 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt'
    }

    try {
        let conn = await connect(gfwurl);
        let gfwraw = await promisfy.waitFor(conn, 'data');
        let gfwlist = processGfwRawData(gfwraw);

        let tpl = await readfile('./tpl.pac', {encoding: 'utf8'});

        let result = tpl.replace('__RULES__', JSON.stringify(gfwlist))
            .replace('__PROXY__', proxy ? `'${proxy}'` : '\'SOCKS5 127.0.0.1:1080\'');

        await writefile('./gfw.pac', result);
    } catch (e) {
        console.log(e);
    }
}

commander.version('1.0.0')
.usage('[options]')
.option('--proxy [proxy string]', 'a pac-file-liked proxy string, default to SOCK5 127.0.0.1:1080')
.option('--tiny', 'use a tiny version of gfwlist, this may help reduce memory use of pac')
.parse(process.argv);

main(commander.proxy, commander.tiny);
