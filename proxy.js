const params = new URLSearchParams(location.search);
const target = params.get("url");

const RELAY = "https://api.allorigins.win/raw?url=";

if (!target) {
  document.body.textContent = "No URL provided";
  throw "";
}

fetch(RELAY + encodeURIComponent(target))
  .then(r => r.text())
  .then(html => {
    html = html.replace(
      /(href|src)=["'](https?:\/\/[^"']+)["']/g,
      (_, a, u) => `${a}="proxy.html?url=${encodeURIComponent(u)}"`
    );

    html = html.replace(
      /url\((https?:\/\/[^)]+)\)/g,
      (_, u) => `url(proxy.html?url=${encodeURIComponent(u)})`
    );

    document.getElementById("app").innerHTML = html;
  })
  .catch(e => {
    document.body.textContent = "Blocked or unavailable";
  });
