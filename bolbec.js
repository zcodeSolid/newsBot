const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

app.use(express.json());

let browser;

async function initializeBrowser() {
    browser = await puppeteer.launch({ headless: false });
}

app.post('/rephrase', async (req, res) => {
    let { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).send('Title and content are required');
    }

    const prompt = `Rephrase and generate SEO-friendly content. Ensure the result is well-structured and formatted in HTML. Provide JSON output with title, content, and SEO data.

    {
      "title": "New rephrased title",
      "content": "<h1>Formatted content</h1><p>...</p>",
      "seo_title": "SEO Optimized Title",
      "meta_description": "SEO Meta Description",
      "focus_keyword": "Main Keyword"
    }

    Original title: "${title}"
    Original content: "${content}"`;

    try {
        const page = await browser.newPage();
        await page.goto("https://deepai.org/chat", { waitUntil: 'networkidle2' });

        // Enter prompt
        await page.evaluate((content) => {
            document.querySelector('.chatbox').value = content;
        }, prompt);
        await page.click('#chatSubmitButton');

        // 🟢 **Wait for the AI to complete its response** (keep checking until content stops updating)
        let previousText = "";
        let responseText = "";
        let retries = 0;

        while (retries < 20) {  // Max wait: 20 * 1s = 20s
            await page.waitForTimeout(1000); // Wait for AI to generate more text
            responseText = await page.$eval('.outputBox .markdownContainer', el => el.innerText.trim());

            if (responseText === previousText) {
                break;  // 🛑 Stop when text stops changing
            }

            previousText = responseText;
            retries++;
        }

        // 🔍 **Extract only JSON part**
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("❌ AI response does not contain valid JSON:", responseText);
            return res.status(500).send("AI response is not valid JSON");
        }

        const parsedData = JSON.parse(jsonMatch[0]);
        res.json(parsedData);
        await page.close();
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).send('AI processing error');
    }
});

app.listen(port, async () => {
    console.log(`🟢 AI Server running at http://localhost:${port}`);
    await initializeBrowser();
});
