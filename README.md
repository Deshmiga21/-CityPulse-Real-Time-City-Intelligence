# CityPulse — Real-Time City Intelligence

CityPulse is a browser-based city explorer that **does not use dummy city statistics**.

It searches for a real city and retrieves live/current data from public services:

- **Open-Meteo Geocoding** — city search and coordinates.
- **Open-Meteo Weather API** — current weather conditions.
- **Open-Meteo Air Quality API** — current air-quality indicators.
- **OpenStreetMap + Overpass API** — current map data and mapped infrastructure/features.

## What is intentionally NOT included

CityPulse does not invent:

- population
- city health scores
- city budgets
- water reserves
- energy reserves
- traffic percentages
- emergency incidents
- infrastructure capacity

If a live provider does not return a value, the UI displays **Unavailable**.

## Run

1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. Internet access is required.
4. Search a real city.
5. Choose the returned location.
6. The dashboard fetches current provider data.

A local web server such as VS Code Live Server is recommended if the browser blocks a network request from a local `file://` page.

## Live refresh

The dashboard refreshes live sources every 5 minutes and also has a manual **Refresh** button.

## Map data

The map uses OpenStreetMap tiles. Infrastructure is queried from Overpass using the selected city's coordinates. Overpass is a read-only query service for OpenStreetMap data. OSM data can have a small update lag; CityPulse displays the provider timestamp when supplied.

## Accuracy policy

“Real-time” means the application requests the latest available data from its provider. It does not mean every provider measures every metric continuously or instantaneously.

No provider can guarantee a live value for every city and every category. CityPulse therefore refuses to fabricate missing information.

## Sources

- Open-Meteo: https://open-meteo.com/
- Open-Meteo Weather API: https://open-meteo.com/en/docs
- Open-Meteo Air Quality API: https://open-meteo.com/en/docs/air-quality-api
- OpenStreetMap: https://www.openstreetmap.org/
- Overpass API: https://overpass-api.de/

## GitHub description

> Real-time city intelligence dashboard using live weather, air-quality and OpenStreetMap infrastructure data — with no fabricated city statistics.
