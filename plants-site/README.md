# Pakistan Landscaping & Nursery Plant Directory

A static web application that displays a directory of 500+ plants suitable for landscaping in Pakistan. No backend required — open `plants.html` in a browser to run locally.

## Features

- **Plant directory**: Grid or list view of plants with English name, Urdu name, and category
- **Search**: Filter by English or Urdu name
- **Category filter**: Dropdown to filter by plant category (Palm, Ficus, Fruit, Flowering Tree, Ground Cover, Border Plants, Evergreen, Shading Tree, Outdoor Hedge, Decorative)
- **Plant details**: Click "View Details" to open a page with Wikipedia summary, image, and link
- **Favourites**: Mark plants as favourites and set quantity; stored in `localStorage`
- **Export to PDF**: Export the favourites list as a PDF table (Name, Urdu Name, Quantity) using jsPDF

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- [PapaParse](https://www.papaparse.com/) — CSV parsing
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export

No frameworks or build step.

## Project Structure

```
plants-site/
├── plants.html    # Main directory page
├── plant.html     # Plant detail page (Wikipedia summary)
├── styles.css     # Styles
├── app.js         # Application logic
├── plants.csv     # Dataset (500+ plants)
└── README.md      # This file
```

## How to Run Locally

1. **Option A — Open file directly**  
   Double-click `plants.html` or open it from your file manager.  
   Note: Some browsers restrict loading local CSV/fetch. If the directory does not load, use Option B.

2. **Option B — Local server (recommended)**  
   From the `plants-site` folder, run a simple HTTP server:

   **Python 3:**
   ```bash
   cd plants-site
   python3 -m http.server 8000
   ```
   Then open: http://localhost:8000/plants.html

   **Node (npx):**
   ```bash
   cd plants-site
   npx serve -p 8000
   ```
   Then open: http://localhost:8000/plants.html

   **PHP:**
   ```bash
   cd plants-site
   php -S localhost:8000
   ```
   Then open: http://localhost:8000/plants.html

## Dataset (plants.csv)

- **Columns**: `name`, `urdu_name`, `category`, `wikipedia_url`
- **Categories**: Palm, Ficus, Fruit, Flowering Tree, Ground Cover, Border Plants, Evergreen, Shading Tree, Outdoor Hedge, Decorative
- Plants are species that grow well in Pakistan climate; Urdu names are included where applicable.

## Plant Detail Page

- URL format: `plant.html?name=Mango` (spaces in name can be `_` or encoded)
- Fetches summary from Wikipedia REST API:  
  `https://en.wikipedia.org/api/rest_v1/page/summary/{plant-name}`
- Shows title, description, image (if available), and a link to the full Wikipedia article. Includes loading state and error handling if the request fails.

## Favourites & PDF Export

- Favourites are stored in browser `localStorage` under the key `plant_directory_favourites`.
- Each favourite stores: `name`, `urdu_name`, `quantity`.
- "Export Favourites as PDF" generates a PDF with a table of Name, Urdu Name, and Quantity.

## Browser Support

Works in modern browsers that support ES5, `fetch`, and `localStorage`. For local file usage, a local server is recommended to avoid CORS issues with loading `plants.csv`.
