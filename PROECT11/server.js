const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = __dirname;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(data));
}

async function serveFile(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { message: "მისამართი არასწორია." });
    return;
  }
  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.resolve(ROOT, `.${requestedPath}`);
  const relativePath = path.relative(ROOT, filePath);
  const extension = path.extname(filePath).toLowerCase();
  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    !MIME_TYPES[extension] ||
    path.basename(filePath).startsWith(".")
  ) {
    sendJson(response, 404, { message: "ფაილი ვერ მოიძებნა." });
    return;
  }

  try {
    const content = await fs.promises.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension],
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, { message: "ფაილი ვერ მოიძებნა." });
      return;
    }
    throw error;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url, "http://127.0.0.1");
    if (request.method === "GET" || request.method === "HEAD") {
      await serveFile(request, response, pathname);
    } else {
      sendJson(response, 405, { message: "მოთხოვნის მეთოდი დაშვებული არ არის." });
    }
  } catch (error) {
    console.error("[სერვერი] მოთხოვნის დამუშავება ვერ მოხერხდა:", error.message);
    if (!response.headersSent) {
      sendJson(response, error.statusCode || 500, {
        message: error.statusCode
          ? error.message
          : "სერვერმა მოთხოვნის დამუშავება ვერ შეძლო.",
      });
    } else {
      response.destroy();
    }
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "127.0.0.1", () => {
  console.info(`[სერვერი] მზადაა: http://127.0.0.1:${port}`);
});
