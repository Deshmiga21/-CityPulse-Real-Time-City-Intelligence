(() => {
"use strict";

const $ = id => document.getElementById(id);
const API = {
  geocode: "https://geocoding-api.open-meteo.com/v1/search",
  weather: "https://api.open-meteo.com/v1/forecast",
  air: "https://air-quality-api.open-meteo.com/v1/air-quality",
  overpass: "https://overpass-api.de/api/interpreter"
};
let selected = null;
let map = null;
let markers = [];
let refreshTimer = null;

const weatherCodes = {
  0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
  45:"Fog",48:"Depositing rime fog",51:"Light drizzle",53:"Moderate drizzle",55:"Dense drizzle",
  56:"Light freezing drizzle",57:"Dense freezing drizzle",61:"Slight rain",63:"Moderate rain",65:"Heavy rain",
  66:"Light freezing rain",67:"Heavy freezing rain",71:"Slight snow",73:"Moderate snow",75:"Heavy snow",
  77:"Snow grains",80:"Slight rain showers",81:"Moderate rain showers",82:"Violent rain showers",
  85:"Slight snow showers",86:"Heavy snow showers",95:"Thunderstorm",96:"Thunderstorm with slight hail",99:"Thunderstorm with heavy hail"
};

function esc(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmt(v,unit=""){return v===null||v===undefined||v===""?"Unavailable":`${v}${unit}`;}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2500);}
function providerTime(iso){if(!iso)return "Unavailable";try{return new Date(iso).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});}catch(e){return iso;}}
async function getJSON(url,options={}){
  const r=await fetch(url,{...options,headers:{Accept:"application/json",...(options.headers||{})}});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

$("searchForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const q=$("cityInput").value.trim();
  if(!q)return;
  $("searchResults").innerHTML="<div class='result'>Searching live geocoding data…</div>";
  try{
    const data=await getJSON(`${API.geocode}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
    const results=data.results||[];
    if(!results.length){$("searchResults").innerHTML="<div class='result'>No matching city was returned by the geocoding service.</div>";return;}
    $("searchResults").innerHTML=results.map((r,i)=>`
      <div class="result"><div><b>${esc(r.name)}</b><small>${esc([r.admin1,r.country].filter(Boolean).join(", "))} · ${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}</small></div>
      <button data-city="${i}">Open live data</button></div>`).join("");
    window._geocodes=results;
  }catch(err){$("searchResults").innerHTML="<div class='result'>Could not reach the live geocoding service. Check your internet connection and try again.</div>";}
});
$("searchResults").addEventListener("click",e=>{
  const b=e.target.closest("[data-city]"); if(!b)return;
  const r=window._geocodes[Number(b.dataset.city)];
  loadCity(r);
});
$("changeCity").addEventListener("click",()=>{clearInterval(refreshTimer);$("dashboard").classList.add("hidden");$("welcome").classList.remove("hidden");$("cityInput").focus();});
$("refreshBtn").addEventListener("click",()=>selected&&refreshAll(true));
$("reloadFeatures").addEventListener("click",()=>selected&&loadOSM(selected,true));
$("themeBtn").addEventListener("click",()=>document.body.classList.toggle("light"));

async function loadCity(r){
  selected=r;
  $("welcome").classList.add("hidden");$("dashboard").classList.remove("hidden");
  $("cityName").textContent=r.name;
  $("cityMeta").textContent=[r.admin1,r.country,`Coordinates ${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}`].filter(Boolean).join(" · ");
  initMap(r.latitude,r.longitude);
  await refreshAll(false);
  clearInterval(refreshTimer);
  refreshTimer=setInterval(()=>refreshAll(false),5*60*1000);
}

function initMap(lat,lon){
  if(map){map.remove();map=null;}
  map=L.map("map",{zoomControl:true}).setView([lat,lon],12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(map);
  L.marker([lat,lon]).addTo(map).bindPopup("<b>Selected city</b><br>Live data center").openPopup();
  markers=[];
}

async function refreshAll(manual){
  $("lastUpdated").textContent="Fetching live data…";
  try{
    await Promise.all([loadWeather(),loadAir(),loadOSM(selected,false)]);
    $("lastUpdated").textContent=`Updated ${new Date().toLocaleTimeString()}`;
    if(manual)toast("Live data refreshed.");
  }catch(err){
    $("lastUpdated").textContent="Some sources unavailable";
    if(manual)toast("One or more live sources could not be reached.");
  }
}

async function loadWeather(){
  const p=selected;
  const url=`${API.weather}?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=auto`;
  try{
    const d=await getJSON(url),c=d.current||{};
    $("temp").textContent=fmt(c.temperature_2m,d.current_units?.temperature_2m||"");
    $("condition").textContent=weatherCodes[c.weather_code]||"Unavailable";
    $("wind").textContent=`Wind ${fmt(c.wind_speed_10m,d.current_units?.wind_speed_10m||"")}`;
    $("humidity").textContent=fmt(c.relative_humidity_2m,d.current_units?.relative_humidity_2m||"");
    $("feels").textContent=`Feels like ${fmt(c.apparent_temperature,d.current_units?.apparent_temperature||"")}`;
    $("pressure").textContent=`Pressure ${fmt(c.pressure_msl,d.current_units?.pressure_msl||"")}`;
    $("weatherTime").textContent=`Provider time: ${providerTime(c.time)}`;
    $("weatherDetails").innerHTML=[
      ["Temperature",fmt(c.temperature_2m,d.current_units?.temperature_2m)],
      ["Feels like",fmt(c.apparent_temperature,d.current_units?.apparent_temperature)],
      ["Humidity",fmt(c.relative_humidity_2m,d.current_units?.relative_humidity_2m)],
      ["Wind speed",fmt(c.wind_speed_10m,d.current_units?.wind_speed_10m)],
      ["Wind direction",fmt(c.wind_direction_10m,d.current_units?.wind_direction_10m)],
      ["Cloud cover",fmt(c.cloud_cover,d.current_units?.cloud_cover)],
      ["Precipitation",fmt(c.precipitation,d.current_units?.precipitation)],
      ["Pressure",fmt(c.pressure_msl,d.current_units?.pressure_msl)]
    ].map(x=>`<div class="detail"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("");
  }catch(e){
    $("condition").textContent="Unavailable"; $("weatherDetails").innerHTML="<div class='detail'><span>Weather provider</span><b>Unavailable</b></div>";
  }
}

async function loadAir(){
  const p=selected;
  const url=`${API.air}?latitude=${p.latitude}&longitude=${p.longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi&timezone=auto`;
  try{
    const d=await getJSON(url),c=d.current||{},u=d.current_units||{};
    $("aqi").textContent=c.us_aqi===undefined?"Unavailable":c.us_aqi;
    $("pm25").textContent=`PM2.5 ${fmt(c.pm2_5,u.pm2_5)}`;
    $("aqTime").textContent=`Provider time: ${providerTime(c.time)}`;
    const items=[["US AQI",c.us_aqi,u.us_aqi],["European AQI",c.european_aqi,u.european_aqi],["PM2.5",c.pm2_5,u.pm2_5],["PM10",c.pm10,u.pm10],["O₃",c.ozone,u.ozone],["NO₂",c.nitrogen_dioxide,u.nitrogen_dioxide],["SO₂",c.sulphur_dioxide,u.sulphur_dioxide],["CO",c.carbon_monoxide,u.carbon_monoxide]];
    $("airDetails").innerHTML=items.map(x=>`<div class="air"><span>${x[0]}</span><b>${fmt(x[1],x[2])}</b></div>`).join("");
  }catch(e){
    $("aqi").textContent="Unavailable";$("pm25").textContent="PM2.5 Unavailable";$("airDetails").innerHTML="<div class='air'><span>Air-quality provider</span><b>Unavailable</b></div>";
  }
}

async function loadOSM(p,manual){
  const d=.055;
  const south=Number(p.latitude)-d,north=Number(p.latitude)+d,west=Number(p.longitude)-d,east=Number(p.longitude)+d;
  const q=`[out:json][timeout:25];(
    nwr["amenity"~"hospital|clinic|school|university|police|fire_station"]( ${south},${west},${north},${east});
    nwr["public_transport"]( ${south},${west},${north},${east});
    nwr["leisure"~"park|sports_centre"]( ${south},${west},${north},${east});
  );out center tags;`;
  try{
    const data=await getJSON(API.overpass,{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded"}});
    const els=data.elements||[];
    $("featureCount").textContent=`${els.length.toLocaleString()} mapped features returned`;
    $("osmStamp").textContent=data.osm3s?.timestamp?`OSM ${providerTime(data.osm3s.timestamp)}`:"OSM timestamp unavailable";
    const counts={hospital:0,clinic:0,school:0,university:0,police:0,fire_station:0,public_transport:0,park:0,sports_centre:0};
    const names=[];
    els.forEach(el=>{
      const t=el.tags||{},kind=t.amenity||t.leisure||(t.public_transport?"public_transport":null);
      if(kind&&counts[kind]!==undefined)counts[kind]++;
      if(t.name&&names.length<12)names.push({name:t.name,kind});
      const lat=el.lat??el.center?.lat,lon=el.lon??el.center?.lon;
      if(lat!==undefined&&lon!==undefined&&map&&markers.length<100){
        const marker=L.circleMarker([lat,lon],{radius:5,weight:1,fillOpacity:.65});
        marker.bindPopup(`<b>${esc(t.name||"Mapped feature")}</b><br>${esc(kind||"OSM feature")}`);
        marker.addTo(map);markers.push(marker);
      }
    });
    $("featureDetails").innerHTML=[
      ["Hospitals",counts.hospital],["Clinics",counts.clinic],["Schools",counts.school],
      ["Universities",counts.university],["Police",counts.police],["Fire stations",counts.fire_station],
      ["Public transport",counts.public_transport],["Parks",counts.park],["Sports centres",counts.sports_centre]
    ].map(x=>`<div class="feature"><b>${x[1].toLocaleString()}</b><span>${x[0]} in the queried area</span></div>`).join("")+
    (names.length?`<div class="feature" style="grid-column:1/-1"><b>Named places returned</b><span>${names.map(n=>esc(n.name)).join(" · ")}</span></div>`:"");
  }catch(e){
    $("featureCount").textContent="Unavailable";$("osmStamp").textContent="OSM unavailable";
    $("featureDetails").innerHTML="<div class='feature'><b>Unavailable</b><span>OpenStreetMap query could not be completed.</span></div>";
  }
}
})();