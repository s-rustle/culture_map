# Roster Data Format (Amendment 1)

Global Pulse loads roster data from `data/roster.csv`. **Two columns only. No PII.**

## Expected Schema

| Column  | Aliases              | Required | Description                               |
|---------|----------------------|----------|-------------------------------------------|
| city    | city, state, region, location | ✅ Yes    | City or state/region name                 |
| country | country              | ✅ Yes   | Country name (e.g., Brazil, United States) |

**Auto-derived** (do not provide): `country_code`, `timezone`, `latitude`, `longitude`

## CSV Format

- **First row:** Headers (column names)
- **Encoding:** UTF-8
- **Separator:** Comma (`,`)
- **Quoted fields:** Use double quotes for values containing commas

Column names are matched **case-insensitively**. Examples of valid headers:
- `city,country`
- `City,Country`
- `state,country` (state/region as location)
- `Country,State` (country first, state second)

## Example

```csv
city,country
São Paulo,Brazil
Medellín,Colombia
Kraków,Poland
Toronto,Canada
Ontario,Canada
```

## Geo Derivation

The loader uses `data/geo-lookup.json` to derive:
- **country_code:** ISO 3166-1 alpha-2 from country name
- **timezone:** IANA timezone for the city/region
- **latitude / longitude:** City-level coordinates

If a city or region is not in the lookup, the country capital is used as fallback. Unknown countries produce a validation error.

## Example File

See `data/roster-schema-example.csv` for a minimal example.
