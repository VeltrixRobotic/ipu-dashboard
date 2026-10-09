# IPU UTHM Air Quality Dashboard

Static HTML/CSS/JavaScript dashboard for the AQICN / World Air Quality Index Project Batu Pahat feed (station ID 9493).

## Files

- `index.html` — dashboard layout
- `style.css` — responsive dark dashboard styling
- `app.js` — configuration, API fetch, display, refresh and chart logic

## 1. Register for an API token

Register at https://aqicn.org/data-platform/token/ and review the current API terms at https://aqicn.org/api/.

Before publishing data publicly, comply with WAQI's terms. Attribution to WAQI and the originating environmental agency is required. Public for-profit use requires explicit agreement; public non-profit use requires prior notification. Data may not be sold, included in sold packages, or redistributed as cached/archived data under the published terms.

## 2. Recommended token-safe configuration

Do not put your API token in `app.js` on a public GitHub Pages site. Anything delivered to a browser can be viewed by visitors.

Recommended architecture:

1. Host a small HTTPS API proxy on a server or serverless platform.
2. Store the WAQI token in that platform's server-side environment secret, for example `WAQI_TOKEN`.
3. The proxy requests `https://api.waqi.info/feed/@9493/?token=...` and returns the JSON response.
4. Configure `API_PROXY_URL` in `app.js` to your proxy endpoint.
5. Restrict the proxy to the required station, add rate limiting, and do not expose the token in responses or logs.

Example `app.js` configuration:

```js
const CONFIG = {
  STATION_ID: "9493",
  API_PROXY_URL: "https://YOUR-API-HOST.example/api/air-quality",
  DIRECT_API_TOKEN: "",
  REFRESH_INTERVAL_MS: 10 * 60 * 1000
};
```

The proxy URL above is a placeholder. It is not a working endpoint until you deploy your own proxy.

### Temporary private testing only

You can paste a token into `DIRECT_API_TOKEN` locally to test, but the token will be visible in browser code and network requests. Do not commit that token or publish it in a public repository. Remove it after testing and consider rotating the token if exposed.

## 3. Publish using GitHub Pages

1. Create a new repository named `ipu-dashboard`.
2. Upload `index.html`, `style.css`, `app.js`, and `README.md`.
3. Open repository **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. In **Custom domain**, enter `ipu.uthmiot.my` and save.
6. In the DNS manager for `uthmiot.my`, add a CNAME record:
   - Name/Host: `ipu`
   - Target/Value: `YOUR-GITHUB-USERNAME.github.io`
7. Do not change DNS records for the root domain or existing site.
8. After DNS is ready, enable **Enforce HTTPS** in GitHub Pages.

## 4. Dashboard behavior

- Refreshes every 10 minutes by default.
- Manual refresh button included.
- No invented/demo measurements; unavailable values appear as `--`.
- Displays AQI category, available pollutants and weather values.
- Chart uses source-provided PM2.5 forecast data if present; it does not fabricate historical observations.
- Includes attribution links and a disclaimer.

## Notes

The AQI category thresholds in this UI are the familiar US AQI bands, but WAQI station AQI may not be directly interchangeable with Malaysia's official IPU scale. Label the scale clearly and use official Malaysian DOE guidance for official local interpretation. This dashboard is informational, not an emergency alert system.
