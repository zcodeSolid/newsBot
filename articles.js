const puppeteer = require('puppeteer');

async function getRedditViralNews() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('🔍 Opening Reddit...');
        await page.goto('https://www.reddit.com/r/all/top/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for the posts to load
        await page.waitForSelector('.Post');

        const posts = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.Post')).slice(0, 5).map(post => {
                const title = post.querySelector('h3') ? post.querySelector('h3').innerText.trim() : null;
                const content = post.querySelector('div[data-test-id="post-content"]') ? post.querySelector('div[data-test-id="post-content"]').innerText.trim() : null;
                const image = post.querySelector('img') ? post.querySelector('img').src : null;

                return {
                    title,
                    content,
                    image,
                };
            });
        });

        console.log('📰 Scraped Posts:', posts);
        await browser.close();
        return posts;
    } catch (error) {
        console.error('❌ Error scraping Reddit:', error);
        await browser.close();
        return [];
    }
}

getRedditViralNews().then(posts => {
    if (posts.length === 0) {
        console.log('⚠️ No posts found.');
    } else {
        posts.forEach(post => {
            console.log(`Title: ${post.title}`);
            console.log(`Content: ${post.content}`);
            console.log(`Image: ${post.image}`);
            console.log('---');
        });
    }
});
