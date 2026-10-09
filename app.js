/*
 * IPU UTHM dashboard configuration.
 *
 * Preferred public deployment:
 *   Set API_PROXY_URL to your server-side proxy endpoint.
 *   Store the WAQI token as a server environment secret, NOT in this file.
 *
 * Direct browser mode exists only for local/private testing. Any token placed
 * here is public to every visitor and will be exposed in browser network tools.
 */
const CONFIG = {
  STATION_ID: "9493",
  API_PROXY_URL:"https://ipu-aqi-proxy.veltrix-robotic.workers.dev/api/air-quality",
  DIRECT_API_TOKEN: "",
  REFRESH_INTERVAL_MS: 10 * 60 * 1000
};

const $ = (id) => document.getElementById(id);
let chart = null;
let refreshTimer = null;

function setText(id, value) {
  $(id).textContent = value === undefined || value === null || value === "" ? "--" : String(value);
}
function numberValue(value) {
  if (value === undefined || value === null || value === "" || value === "-") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function fmt(value, digits = 1) {
  const n = numberValue(value);
  return n === null ? "--" : (Number.isInteger(n) ? String(n) : n.toFixed(digits));
}
function aqiInfo(aqi) {
  if (aqi === null) return { label: "Waiting for readings", badge: "NO DATA", css: "unknown", color: "#7d91aa", advice: "No valid AQI value was provided by the source." };
  if (aqi <= 50) return { label: "Good", badge: "GOOD", css: "good", color: "#31c78b", advice: "Air quality is generally satisfactory. Continue normal activities." };
  if (aqi <= 100) return { label: "Moderate", badge: "MODERATE", css: "moderate", color: "#e5c84c", advice: "Sensitive individuals may consider reducing prolonged, heavy outdoor exertion if symptoms occur." };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", badge: "SENSITIVE GROUPS", css: "sensitive", color: "#f29a45", advice: "Sensitive groups should consider reducing prolonged outdoor exertion." };
  if (aqi <= 200) return { label: "Unhealthy", badge: "UNHEALTHY", css: "unhealthy", color: "#e95b63", advice: "Consider reducing prolonged outdoor exertion and follow official local advisories." };
  if (aqi <= 300) return { label: "Very unhealthy", badge: "VERY UNHEALTHY", css: "very", color: "#a968d4", advice: "Avoid prolonged outdoor exertion and follow official local advisories." };
  return { label: "Hazardous", badge: "HAZARDOUS", css: "hazardous", color: "#ff6675", advice: "Avoid outdoor exertion and follow official emergency and health guidance." };
}
function setStatus(label, connected) {
  setText("connectionLabel", label);
  const dot = document.querySelector(".live-indicator i");
  dot.style.background = connected ? "#37d6a0" : "#e3a34e";
  dot.style.boxShadow = connected ? "0 0 0 4px #37d6a020" : "0 0 0 4px #e3a34e20";
}
function updatePollutant(id, barId, value, max) {
  setText(id, fmt(value));
  const n = numberValue(value);
  $(barId).style.width = n === null ? "0%" : `${Math.max(2, Math.min(100, n / max * 100))}%`;
}
function updateChart(data) {
  const forecast = data.forecast && data.forecast.daily && data.forecast.daily.pm25;
  const canvas = $("aqiChart");
  const empty = $("chartEmpty");
  if (!window.Chart || !Array.isArray(forecast) || forecast.length < 2) {
    if (chart) { chart.destroy(); chart = null; }
    empty.style.display = "grid";
    return;
  }
  const labels = forecast.map(x => x.day || "");
  const values = forecast.map(x => numberValue(x.avg));
  empty.style.display = "none";
  if (chart) chart.destroy();
  chart = new Chart(canvas, {
    type: "line",
    data: { labels, datasets: [{ label: "PM2.5 forecast", data: values, borderColor: "#37d6a0", backgroundColor: "rgba(55,214,160,.10)", fill: true, tension: .35, pointRadius: 3, pointBackgroundColor: "#37d6a0", spanGaps: true }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#9bb0c9", boxWidth: 10, usePointStyle: true } } }, scales: { x: { ticks: { color: "#8095af" }, grid: { color: "rgba(129,149,175,.10)" } }, y: { beginAtZero: true, ticks: { color: "#8095af" }, grid: { color: "rgba(129,149,175,.10)" } } } }
  });
}
function render(data) {
  const aqi = numberValue(data.aqi);
  const info = aqiInfo(aqi);
  setText("aqiValue", aqi === null ? "--" : Math.round(aqi));
  setText("aqiCategory", info.label);
  setText("aqiAdvice", info.advice);
  $("aqiBadge").textContent = info.badge;
  $("aqiBadge").className = `status-pill status-${info.css}`;
  $("aqiDial").style.setProperty("--dial-color", info.color);
  const degrees = aqi === null ? 0 : Math.max(3, Math.min(360, aqi / 300 * 360));
  $("aqiDial").style.background = `conic-gradient(${info.color} ${degrees}deg, #25364b ${degrees}deg)`;

  const iaqi = data.iaqi || {};
  const pollutant = (key) => iaqi[key] && iaqi[key].v !== undefined ? iaqi[key].v : null;
  updatePollutant("pm25", "barPm25", pollutant("pm25"), 150);
  updatePollutant("pm10", "barPm10", pollutant("pm10"), 200);
  updatePollutant("o3", "barO3", pollutant("o3"), 100);
  updatePollutant("no2", "barNo2", pollutant("no2"), 100);
  updatePollutant("so2", "barSo2", pollutant("so2"), 100);
  updatePollutant("co", "barCo", pollutant("co"), 10);

  setText("temperature", fmt(pollutant("t")));
  setText("humidity", fmt(pollutant("h"), 0));
  setText("pressure", fmt(pollutant("p")));
  setText("wind", fmt(pollutant("w")));

  setText("stationName", (data.city && data.city.name) || `AQICN station ID ${CONFIG.STATION_ID}`);
  setText("updatedAt", (data.time && (data.time.s || data.time.iso)) || "Time not provided");
  $("setupNotice").style.display = "none";
  setStatus("LIVE DATA CONNECTED", true);
  updateChart(data);
}
async function fetchAirQuality() {
  const button = $("refreshBtn");
  button.disabled = true;
  button.style.opacity = ".65";
  try {
    let url;
    if (CONFIG.API_PROXY_URL.trim()) {
      url = CONFIG.API_PROXY_URL.trim();
    } else if (CONFIG.DIRECT_API_TOKEN.trim()) {
      url = `https://api.waqi.info/feed/@${encodeURIComponent(CONFIG.STATION_ID)}/?token=${encodeURIComponent(CONFIG.DIRECT_API_TOKEN.trim())}`;
    } else {
      setStatus("SETUP REQUIRED", false);
      $("setupNotice").style.display = "flex";
      showToast("Add your proxy URL to app.js after API setup.");
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try { response = await fetch(url, { cache: "no-store", signal: controller.signal }); }
    finally { clearTimeout(timeout); }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    // A proxy may return the WAQI envelope or only the data object.
    const data = json && json.status === "ok" ? json.data : json && json.aqi !== undefined ? json : null;
    if (!data || (json.status && json.status !== "ok")) throw new Error((json && json.data) || "API returned no valid data");
    render(data);
  } catch (error) {
    setStatus("DATA UNAVAILABLE", false);
    showToast(`Unable to load air quality data: ${error.message}`);
    $("setupNotice").style.display = "flex";
    const p = $("setupNotice").querySelector("p");
    p.textContent = "The data source could not be reached. Check your API token, proxy configuration, network access, and AQICN usage permissions. No fallback readings are shown.";
  } finally {
    button.disabled = false;
    button.style.opacity = "1";
  }
}
let toastTimer;
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}
document.addEventListener("DOMContentLoaded", () => {
  $("refreshBtn").addEventListener("click", fetchAirQuality);
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchAirQuality, CONFIG.REFRESH_INTERVAL_MS);
  fetchAirQuality();
});
