const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

let browser;

async function initializeBrowser() {
    browser = await puppeteer.launch({ headless: true });
}

app.post('/rephrase', async (req, res) => {
    let { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).send('Title and content are required');
    }

    const prompt = `Rephrase and generate SEO-friendly content in English. Ensure the result is well-structured and formatted in HTML. Keep the context but make it unique. Provide the following JSON structure:

    {
      "title": "New rephrased title",
      "content": "<h1>Formatted HTML content...</h1><p>...</p>",
      "seo_title": "Optimized SEO title",
      "meta_description": "Short compelling meta description (max 160 characters)",
      "focus_keyword": "Primary keyword for SEO"
    }
    
    Original title: "${title}"
    Original content: "${content}"`;

    try {
        const page = await browser.newPage();
        await page.goto("https://deepai.org/chat", { waitUntil: 'networkidle2' });
        console.log('Navigated to AI chatbot');

        // Remove ads
        await page.evaluate(() => {
            const adSelectors = ['.ad', '.adsbygoogle', '[id^="ad-"]', '[class*="banner"]'];
            adSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(ad => ad.remove());
            });
        });
        console.log('Ads removed');

        // Input selectors
        const inputSelector = '.chatbox';
        const buttonSelector = '#chatSubmitButton';
        const responseSelector = '.outputBox .markdownContainer';

        // Enter prompt into AI chatbox
        await page.waitForSelector(inputSelector, { visible: true, timeout: 10000 });
        await page.evaluate((selector, content) => {
            document.querySelector(selector).value = content;
        }, inputSelector, prompt);
        console.log('Prompt entered');

        // Click submit button
        await page.waitForSelector(buttonSelector, { visible: true, timeout: 10000 });
        await page.click(buttonSelector);
        console.log('Submitted request');

        // Wait for response
        await page.waitForSelector(responseSelector, { visible: true, timeout: 50000 });
        console.log('AI response received');

        let responseSent = false;

        const extractJson = async () => {
            return new Promise((resolve, reject) => {
                const intervalId = setInterval(async () => {
                    const responseText = await page.$eval(responseSelector, el => el.innerText.trim());
                    const startIdx = responseText.indexOf('{');
                    const endIdx = responseText.lastIndexOf('}');
                    if (startIdx !== -1 && endIdx !== -1) {
                        clearInterval(intervalId);
                        try {
                            const extractedJson = responseText.substring(startIdx, endIdx + 1);
                            const parsedData = JSON.parse(extractedJson);

                            // Ensure only one response is sent
                            if (!responseSent) {
                                responseSent = true;
                                res.json(parsedData);
                                resolve();
                            }
                        } catch (error) {
                            console.error('Error parsing JSON:', error);
                            if (!responseSent) {
                                responseSent = true;
                                res.status(500).send('Invalid JSON response from AI');
                                reject(error);
                            }
                        }
                    }
                }, 200);

                const timeoutId = setTimeout(() => {
                    clearInterval(intervalId);
                    if (!responseSent) {
                        responseSent = true;
                        res.status(500).send('Timeout waiting for valid JSON response');
                        reject(new Error('Timeout waiting for valid JSON response'));
                    }
                }, 100000); // Increased timeout to 100 seconds
            });
        };

        await extractJson();
        // Don't need to explicitly close page since it's handled in the extractJson function
    } catch (err) {
        console.error('Error during interaction:', err);
        if (!res.headersSent) {
            res.status(500).send('An error occurred while processing the request');
        }
    }
});

app.listen(port, async () => {
  console.log(`🟢 AI Server running at http://localhost:${port}`);
  await initializeBrowser();
});
