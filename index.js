const puppeteer = require('puppeteer');
const ip = require('ip');
const express = require('express');
const cheerio = require('cheerio');
const PromisePool = require('es6-promise-pool');

const app = express();

const PORT = 3000;

const sources = [
    {
        name: 'Surfline',
        url:
            'http://www.surfline.com/surf-report/pacific-beach-southern-california_4250/',
        selector: '#observed-wave-range'
    },
    {
        name: 'Magic Seaweed',
        url: 'https://magicseaweed.com/Pacific-Beach-Surf-Report/663/',
        selector: '.rating-text.text-dark'
    }
];

let $;
let browser;
let results = [];

const crawlSource = async source => {
    try {
        const page = await browser.newPage();

        console.log(`Opening ${source.url}`);
        await page.goto(source.url);

        console.log(`Evaluating ${source.url}`);
        const contents = await page.content();

        $ = cheerio.load(contents);

        results.push({
            site: source.name,
            size: $(source.selector)
                .text()
                .trim()
        });

        console.log(`Closing ${source.url}`);
        await page.close();
    } catch (e) {
        console.log(e);
    }
};

const promiseProducer = () => {
    const source = sources.pop();

    return source ? crawlSource(source) : null;
};

app.get('/*', async (req, res) => {
    browser = await puppeteer.launch();

    const pool = new PromisePool(promiseProducer, 5);
    await pool.start();

    await browser.close();

    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Surf Report Aggregator</title>
            </head>
            <body>
                <h1>San Diego - Pacific Beach</h1>
                <div>${results.reduce((acc, cur) => {
                    return (acc += '<h2>' + cur.site + ': ' + cur.size + '</h2>');
                }, '')}</div>
            </body>

        </html>
    `;
    res.send(html);
});

app.listen(3000, '0.0.0.0', err => {
    console.log('Local: localhost:' + PORT);
    console.log('LAN: ', ip.address());
});
