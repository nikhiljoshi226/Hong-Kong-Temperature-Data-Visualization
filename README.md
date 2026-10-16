# Hong Kong Temperature Heatmap

D3.js charts of Hong Kong's daily temperature, 1997–2017.

## Level 1

- One cell per month: years across, months down.
- Colour shows the month's max or min temperature.
- Click a cell to switch max / min.
- Hover a cell to see the date and temperatures.

## Level 2

- Same matrix, last 10 years only.
- Each cell has a mini line chart of every day.
- Green line: daily max. Blue line: daily min.

## How to run

- Run `python -m http.server 8080 --bind 127.0.0.1` in this folder.
- Open http://127.0.0.1:8080.
- Or use the VS Code Live Server extension on `index.html`.
- Don't open `index.html` directly; the data won't load.

## Files

- `index.html`: the page
- `app.js`: loads data and switches levels
- `common.js`: code shared by both levels
- `Level1_main.js`: Level 1 chart
- `Level2_main.js`: Level 2 chart
- `styles.css`: page styles
- `temperature_daily.csv`: the data
