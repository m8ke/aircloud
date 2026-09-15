const port = process.env["SERVER_PORT"] || "8000";
const target = `http://localhost:${port}`;

module.exports = {
    "/api": {
        target: target,
        secure: false,
        changeOrigin: false,
        pathRewrite: {
            "^/api": ""
        }
    },
    "/ws": {
        target: target,
        secure: false,
        changeOrigin: false,
        ws: true
    }
};
