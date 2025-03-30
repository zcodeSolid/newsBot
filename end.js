const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

let browser, page;

(async () => {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    page = await browser.newPage();
    await page.goto('https://deepai.org/chat');

    // Remove iframes and ads to ensure elements remain clickable
    await page.evaluate(() => {
        document.querySelectorAll('iframe, .ads, #ads, [id*="ad"], [class*="ad"]').forEach(el => el.remove());
    });

    console.log('Puppeteer browser is ready.');
})();

async function rephraseText(inputText) {
    await page.evaluate((inputText) => {
        // Remove iframes and ads before interaction
        document.querySelectorAll('iframe, .ads, #ads, [id*="ad"], [class*="ad"]').forEach(el => el.remove());

        const chatboxes = document.querySelectorAll('.chatbox-wrapper');
        const lastChatbox = chatboxes[chatboxes.length - 1];
        const textarea = lastChatbox.querySelector('.chatbox');
        textarea.value = inputText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, inputText);

    await page.click('#chatSubmitButton');
    await new Promise(resolve => setTimeout(resolve, 5000));

    return await page.evaluate(() => {
        const outputBoxes = document.querySelectorAll('.outputBox .markdownContainer');
        return outputBoxes[outputBoxes.length - 1].innerText;
    });
}

app.post('/rephrase', async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    try {
        const rephrasedTitle = await rephraseText(`Rephrase this title: ${title}`);
        const rephrasedContent = await rephraseText(`Rephrase this content: ${content}`);

        res.json({ title: rephrasedTitle, content: rephrasedContent });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Failed to rephrase content' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
