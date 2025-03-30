const axios = require('axios');

const API_URL = 'https://deepskyblue-spoonbill-429577.hostingersite.com/create-blog-api-endpoint.php'; // Change to your actual endpoint URL
const AUTH_TOKEN = 'your-secret-token'; // Replace with your actual token

const postData = {
    title: "Test Blog Post",
    content: "This is a test blog post created via API.",
    category: 76, // Replace with an existing category ID
    seo_title: "Test SEO Title",
    seo_description: "This is an SEO description for the test blog post.",
    seo_keywords: "test, blog, seo",
    image_url: "https://uploads.dailydot.com/2025/03/MCOTW-SXSW-2025.jpg?q=65&auto=format&w=1000&ar=2:1&fit=crop" // Replace with a valid image URL
};

axios.post(API_URL, postData, {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
    }
})
.then(response => {
    console.log("Success:", response.data);
})
.catch(error => {
    console.error("Error:", error.response ? error.response.data : error.message);
});
