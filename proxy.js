const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3001;

app.use(cors());

app.use(
    '/api',
    createProxyMiddleware({
        target: 'https://sxcran.ac.in',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
        on: {
            error: (err, req, res) => {
                console.error('Proxy error:', err.message);
                res.status(500).json({ error: 'Proxy error' });
            },
        },
    })
);

app.listen(PORT, () => {
    console.log(`✓ CORS proxy running at http://localhost:${PORT}`);
    console.log(`  Web: POST http://localhost:${PORT}/api/Student/showOverallAttendance`);
});
