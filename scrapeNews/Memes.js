const puppeteer = require('puppeteer');
const axios = require('axios');

const WORDPRESS_API_URL = 'https://deepskyblue-spoonbill-429577.hostingersite.com/create-blog-api-endpoint.php';
const AUTH_TOKEN = 'your-secret-token';
const CATEGORY_URL = 'https://www.dailydot.com/tags/memes/'; 

async function getArticlesFromCategory(browser) {
    try {
        console.log(`🔍 Scraping category: ${CATEGORY_URL}`);
        const page = await browser.newPage();
        await page.goto(CATEGORY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('.articles__card', { timeout: 15000 });

        const currentDate = new Date();
        const articles = await page.evaluate((currentDateISO) => {
            const currentDate = new Date(currentDateISO);

            return Array.from(document.querySelectorAll('.articles__card'))
                .map(article => {
                    const linkElement = article.querySelector('a');
                    const dateElement = article.querySelector('.articles__card__text__stamp time');

                    return {
                        link: linkElement ? linkElement.href : null,
                        date: dateElement ? new Date(dateElement.getAttribute("datetime")) : null
                    };
                })
                .filter(article => 
                    article.link &&
                    article.date &&
                    article.date.getFullYear() === currentDate.getFullYear() &&
                    article.date.getMonth() === currentDate.getMonth() &&
                    article.date.getDate() === currentDate.getDate()
                );
        }, currentDate.toISOString());

        await page.close();
        console.log(`✅ Found ${articles.length} articles in ${CATEGORY_URL}`);
        return articles;
    } catch (error) {
        console.error(`❌ Error scraping category ${CATEGORY_URL}:`, error);
        return [];
    }
}

async function scrapeArticle(article, browser) {
    try {
        console.log(`🔎 Scraping article: ${article.link}`);
        const page = await browser.newPage();
        await page.goto(article.link, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const articleData = await page.evaluate(() => {
            const titleElement = document.querySelector('meta[property="og:title"]') || document.querySelector('title');
            const descElement = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
            const imageElement = document.querySelector('meta[property="og:image"]');
            const contentElement = document.querySelector('.article-content-wrapper');

            return {
                title: titleElement ? titleElement.getAttribute('content') || titleElement.innerText.trim() : null,
                seo_description: descElement ? descElement.getAttribute('content') : null,
                image_url: imageElement ? imageElement.getAttribute('content') : null,
                content: contentElement ? contentElement.innerHTML : null,
            };
        });

        await page.close();

        if (!articleData.title || !articleData.content) {
            console.log('⚠️ Skipping article due to missing data.');
            return null;
        }

        articleData.seo_title = articleData.title;
        articleData.seo_keyword = articleData.title.split(' ').slice(0, 5).join(', ');

        console.log(`✅ Successfully scraped: ${articleData.title}`);
        return articleData;
    } catch (error) {
        console.error(`❌ Error scraping article ${article.link}:`, error);
        return null;
    }
}

async function postToWordPress(article) {
    try {
        console.log(`🚀 Posting: ${article.title}`);

        const response = await axios.post(WORDPRESS_API_URL, {
            title: article.title,
            content: `<p>${article.seo_description || ''}</p>${article.content}`,
            image_url: article.image_url,
            seo_title: article.seo_title,
            seo_keyword: article.seo_keyword,
            seo_description: article.seo_description,
            category: 77
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });

        console.log('✅ Post Created:', response.data);
    } catch (error) {
        console.error('❌ Error posting to WordPress:', error.response ? error.response.data : error.message);
    }
}

async function main() {
    const browser = await puppeteer.launch({ headless: false }); // Change to true for headless mode
    const articles = await getArticlesFromCategory(browser);

    console.log(`📰 Total Articles to Scrape: ${articles.length}`);

    for (const article of articles) {
        const scrapedArticle = await scrapeArticle(article, browser);
        if (scrapedArticle) {
            await postToWordPress(scrapedArticle);
        }
    }

    await browser.close();
}

main();
