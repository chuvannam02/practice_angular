/**
 * @Project: practice_angular
 * @Author CHUNAM
 * @Date 1/31/2026
 * @Time 10:18 AM
 */

const WebpackObfuscator = require('webpack-obfuscator');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
    plugins: [
        // 1. OBFUSCATION: Biến code thành "mớ bòng bong" khó đọc
        new WebpackObfuscator({
            rotateStringArray: true,
            stringArray: true,
            stringArrayThreshold: 0.75, // 75% chuỗi sẽ bị mã hóa
            deadCodeInjection: false,   // Tắt để không tăng size quá nhiều (bật true nếu muốn bảo mật cực cao)
            compact: true,
            controlFlowFlattening: true, // Làm phẳng luồng code (if/else thành switch case rối rắm)
            controlFlowFlatteningThreshold: 0.75,
            disableConsoleOutput: true,  // Tắt mọi console.log
            identifierNamesGenerator: 'hexadecimal', // Tên biến thành _0x1a2b...
            renameGlobals: false,
            selfDefending: true,         // Code tự hỏng nếu bị format lại
        }, ['vendor.js', 'polyfills.js']), // Tránh obfuscate vendor để không lỗi thư viện

        // 2. PRE-COMPRESSION: Nén sẵn file .br và .gz để Nginx không tốn CPU nén lúc runtime
        new CompressionPlugin({
            filename: '[path][base].br',
            algorithm: 'brotliCompress',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240,
            minRatio: 0.8,
        }),
        new CompressionPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240,
            minRatio: 0.8,
        }),
    ]
};
