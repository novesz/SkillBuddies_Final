const fs = require("fs");
const path = require("path");

function ensureDirSync(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (_) {
    // ignore
  }
}

function sanitizeCsv(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function safeWrite(stream, line) {
  try {
    stream.write(line);
  } catch (_) {
    // ignore logging failures
  }
}

function createRequestLogger(options = {}) {
  const logsDir = options.logsDir || path.join(__dirname, "logs");
  ensureDirSync(logsDir);

  const txtPath = path.join(logsDir, "api.log.txt");
  const csvPath = path.join(logsDir, "api.log.csv");
  const jsonlPath = path.join(logsDir, "api.log.jsonl");

  const txtStream = fs.createWriteStream(txtPath, { flags: "a" });
  const csvStream = fs.createWriteStream(csvPath, { flags: "a" });
  const jsonlStream = fs.createWriteStream(jsonlPath, { flags: "a" });

  // Add CSV header once (if file empty)
  try {
    if (!fs.existsSync(csvPath) || fs.statSync(csvPath).size === 0) {
      csvStream.write(
        "timestamp,method,url,statusCode,durationMs,ip,userId,userAgent,referrer,contentLength\n"
      );
    }
  } catch (_) {
    // ignore
  }

  return function requestLogger(req, res, next) {
    const startNs = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;

      const ts = new Date().toISOString();
      const method = req.method;
      const url = req.originalUrl || req.url;
      const statusCode = res.statusCode;
      const ip =
        req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
        req.socket?.remoteAddress ||
        "";
      const userAgent = req.headers["user-agent"] || "";
      const referrer = req.headers["referer"] || req.headers["referrer"] || "";
      const contentLength = res.getHeader("content-length") || "";

      // If auth middleware sets req.userId, include it
      const userId = req.userId || req.userID || "";

      const txtLine = `[${ts}] ${method} ${url} ${statusCode} ${durationMs.toFixed(
        1
      )}ms ip=${ip} userId=${userId}\n`;
      safeWrite(txtStream, txtLine);

      const csvLine =
        [
          sanitizeCsv(ts),
          sanitizeCsv(method),
          sanitizeCsv(url),
          sanitizeCsv(statusCode),
          sanitizeCsv(durationMs.toFixed(1)),
          sanitizeCsv(ip),
          sanitizeCsv(userId),
          sanitizeCsv(userAgent),
          sanitizeCsv(referrer),
          sanitizeCsv(contentLength),
        ].join(",") + "\n";
      safeWrite(csvStream, csvLine);

      const jsonLine =
        JSON.stringify({
          timestamp: ts,
          method,
          url,
          statusCode,
          durationMs: Number(durationMs.toFixed(1)),
          ip,
          userId: userId === "" ? null : userId,
          userAgent,
          referrer,
          contentLength,
        }) + "\n";
      safeWrite(jsonlStream, jsonLine);
    });

    next();
  };
}

module.exports = { createRequestLogger };

