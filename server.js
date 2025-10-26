const express = require('express');
const path = require('path');
const morgan = require('morgan');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Serve static files from the views directory
app.use(express.static(path.join(__dirname, 'views')));

// Serve images from the Images directory
app.use('/Images', express.static(path.join(__dirname, 'Images')));

// Route for the root path - serve index.html from views
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Route for services page
app.get('/services.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'services.html'));
});

// Route for contact page
app.get('/Contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Contact.html'));
});

// Route for checkout page
app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

// Route for datetime page
app.get('/datetime.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'datetime.html'));
});

// Route for thank you page
app.get('/thankyou.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'thankyou.html'));
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`🌲 TreePro Services website is running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}/views`);
    console.log(`🖼️  Images served from: ${__dirname}/Images`);
});

module.exports = app;