# 🌍 Landsat Time-Series Data Downloader (Google Earth Engine)

This repository contains scripts for accessing and downloading satellite images from **Landsat 5, Landsat 7, and Landsat 8** using Google Earth Engine.

It is designed to help users generate clean, consistent maps of land changes over time—without needing advanced remote sensing or programming experience.

---

## 📌 What this project does

This project helps you:

* Download satellite images for any location (e.g., a state or region)
* Create clear yearly “snapshots” of the Earth’s surface
* Remove clouds and image noise automatically
* Combine multiple images into a single clean map
* Export results to Google Drive for use in GIS software like QGIS or ArcGIS

---

## 🛰️ Satellite data used

This project uses publicly available NASA/USGS Landsat satellites:

* Landsat 5 (historical data from 1984–2012)
* Landsat 7 (1999–present, used for older modern years)
* Landsat 8 (2013–present, high-quality modern imagery)

These satellites provide free, long-term Earth observation data.

---

## 🗺️ What you can analyze with this data

You can use the outputs to study:

* Urban growth (expansion of cities)
* Forest loss or vegetation change
* Water body changes (rivers, lakes, wetlands)
* Agricultural expansion
* Environmental change over time

---

## 📁 What’s inside this repository

The repository is organized by satellite type:

```
📂 landsat-5/
📂 landsat-7/
📂 landsat-8/
```

Each folder contains Google Earth Engine scripts that:

* Load satellite imagery
* Clean and filter the data
* Generate yearly composite images
* Export results to Google Drive

---

## ⚙️ How it works (simple explanation)

The scripts follow these steps:

1. Select a location (e.g., a state or region)
2. Collect satellite images for a time period
3. Remove clouds and bad-quality pixels
4. Combine multiple images into one clear map
5. Standardize all images so they can be compared across years
6. Export the final images to Google Drive

---

## 📦 Output you will get

After running the scripts, you will receive:

* GeoTIFF files (standard GIS image format)
* One file per year (e.g., 1999, 2004, 2019, 2024)
* Each file contains:

  * Natural color image (RGB)
  * Vegetation index (NDVI)
  * Built-up index (NDBI)
  * Water index (MNDWI)

---

## 💻 Requirements

You do NOT need to install software locally.

You only need:

* A Google account
* Access to Google Earth Engine: [https://earthengine.google.com/](https://earthengine.google.com/)
* Google Drive for downloads

---

## 🚀 How to use

1. Open Google Earth Engine Code Editor
2. Copy a script from this repository
3. Choose your area of interest (state or region)
4. Select the year(s) you want
5. Run the script
6. Go to the “Tasks” tab and click **Run**
7. Download results from Google Drive

---

## 🧭 Example use case

For example, you can compare:

* 1999 → rural landscape
* 2014 → growing settlements
* 2024 → fully urbanized areas

This helps visualize how landscapes change over time.

---

## ⚠️ Important notes

* Cloud cover may affect image quality in some years
* Some older satellites have fewer images available
* Results are best interpreted as **trends**, not exact measurements
* All data is freely provided by NASA/USGS

## 📬 License

This project uses free and open satellite data from NASA/USGS Landsat missions.

You are free to use, modify, and share these scripts for research and educational purposes.

---

## 🤝 Contributions

If you want to improve this project:

* Add new regions
* Improve cloud masking
* Optimize exports
* Add visualization tools

Feel free to submit a pull request or open an issue.