const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME类型映射
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    console.log(`请求: ${req.method} ${req.url}`);
    
    // 处理根路径请求
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // 构建完整的文件路径
    filePath = path.join(__dirname, filePath);
    
    // 获取文件扩展名
    const extname = path.extname(filePath).toLowerCase();
    
    // 获取MIME类型
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // 读取文件
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // 文件不存在
                console.error(`文件不存在: ${filePath}`);
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                // 服务器错误
                console.error(`服务器错误: ${err.code}`);
                res.writeHead(500);
                res.end(`服务器错误: ${err.code}`);
            }
        } else {
            // 成功响应
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('按 Ctrl+C 停止服务器');
});