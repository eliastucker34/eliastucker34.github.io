const fs = require("fs");
const https = require("https");
const express = require("express");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { CookieJar } = require("tough-cookie");
const fetchCookie = require("fetch-cookie").default;

const jar = new CookieJar();
const wrappedFetch = fetchCookie(fetch, jar);

const app = express();

const PROXY_HEADER = "x-proxy-hop";
const MAX_HOPS = 5;

function rewriteUrl(url) {
  return `/proxy?url=${encodeURIComponent(url)}`;
}

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.send("Missing ?url=");

  // 🧱 Anti-loop protection
  const hops = Number(req.headers[PROXY_HEADER] || 0);
  if (hops >= MAX_HOPS) {
    return res.status(508).send("Proxy loop detected");
  }

  try {
    const response = await wrappedFetch(target, {
      headers: {
        [PROXY_HEADER]: hops + 1,
        "user-agent": req.headers["user-agent"] || "ProxyBrowser"
      }
    });

    const contentType = response.headers.get("content-type") || "";
    let body = await response.text();

    // 🎨 HTML rewriting
    if (contentType.includes("text/html")) {
      const $ = cheerio.load(body);

      $("a, link, script, img").each((_, el) => {
        const attr =
          el.tagName === "a" || el.tagName === "link"
            ? "href"
            : "src";

        const val = $(el).attr(attr);
        if (val && val.startsWith("http")) {
          $(el).attr(attr, rewriteUrl(val));
        }
      });

      body = $.html();
    }

    // 🎨 CSS rewriting
    if (contentType.includes("text/css")) {
      body = body.replace(
        /url\((https?:\/\/[^)]+)\)/g,
        (_, url) => `url(${rewriteUrl(url)})`
      );
    }

    res.set("content-type", contentType);
    res.send(body);
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
});

const httpsServer = https.createServer(
  {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem")
  },
  app
);

httpsServer.listen(3000, () => {
  console.log("🔐 HTTPS Proxy running at https://localhost:3000");
});
