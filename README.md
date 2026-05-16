# Landsat Land Use and Land Cover Mapping for Osun State

This project uses Google Earth Engine and Landsat satellite images to study how land cover in and around Osun State changes over time.

It is written for simple comparison across selected years, so a user can generate:

- cleaned satellite image composites
- land use and land cover (LULC) maps
- class area summaries for each year

The work focuses on the following years:

- 1984
- 1999
- 2004
- 2009
- 2014
- 2019
- 2024

Two files are known to be problematic and should not be used for now:

- `years/1987_1991_error.js`
- `years/1991_1997_error.js`

## What This Project Does

In simple terms, the scripts:

1. choose a Nigerian state, currently set to `Osun`
2. add a buffer around the state boundary
3. collect Landsat images for a chosen period
4. remove cloudy and poor-quality pixels
5. combine many images into one clearer composite image
6. calculate useful land-cover indicators such as vegetation, built-up, and water indices
7. classify the land into broad classes
8. export the results to Google Drive

## What The Outputs Mean

The final maps group the land into five broad classes:

- Water
- Vegetation
- Built-up
- Bare Land
- Wetland

Depending on the script you run, you may also get:

- a natural-colour satellite composite
- a raw cluster map from the unsupervised model
- area statistics showing how much land falls into each class

## Folder Guide

`landsat-5/`

Contains example Google Earth Engine scripts for older Landsat 5 image processing.

`landsat-7/`

Contains example scripts for Landsat 7 image processing.

`landsat-8/`

Contains example scripts for Landsat 8 image processing.

`years/`

Contains year-by-year composite scripts. These are useful when you only want the processed satellite image for a specific year.

`unsupervised-classifications/`

Contains the land cover classification scripts. These are the main scripts to use if your goal is to produce LULC maps rather than only satellite composites.

## Most Important Script

The main classification idea in this repository is:

- use 1984 as the training reference year
- train the unsupervised model on the 1984 image
- apply that same model structure to the other supported years

So if your goal is to generate land cover maps, the most important folder is:

- `unsupervised-classifications/`

The classification scripts there:

- build the composite image for the selected year
- use the same band structure across Landsat 5, 7, and 8
- calculate `NDVI`, `NDBI`, and `MNDWI`
- classify the image into land-cover groups
- smooth the final map
- export the class map and raw clusters to Google Drive

## Which Script Should You Run?

Use `years/*.js` when:

- you only want a cleaned composite satellite image for a given year
- you want to inspect the imagery before classification

Use `unsupervised-classifications/*.js` when:

- you want a final land cover map
- you want class areas for comparison across years
- you want to reproduce the classification workflow used in this project

## Recommended Workflow for Coursemates

If you are new to the project, use this order:

1. Open a script from `years/` to view the composite image for your year of interest.
2. Confirm that the image looks reasonable and not heavily affected by cloud.
3. Open the matching script in `unsupervised-classifications/`.
4. Change the `stateName` if you want to work on another Nigerian state.
5. Run the script in Google Earth Engine.
6. Check the map layers and printed results.
7. In the `Tasks` tab, run the export to send the output to Google Drive.

## How The Classification Works

The classification is unsupervised. This means the script groups similar pixels automatically instead of using hand-labelled training points from a human.

To keep the year-to-year comparison more consistent, the workflow:

- trains the clustering setup from the 1984 data
- keeps the same important input bands across years
- reuses the same class interpretation for later years

This is helpful for comparison, but it also means later years should still be checked visually before drawing strong conclusions.

## Data Used

The project uses free Landsat data inside Google Earth Engine:

- Landsat 5 for older years such as 1984 and 1999
- Landsat 7 for 2004 and 2009
- Landsat 8 for 2014, 2019, and 2024

The scripts rename the satellite bands so they follow one common format across the different sensors.

## What You Need

You do not need to install software on your laptop for basic use.

You need:

- a Google account
- access to Google Earth Engine
- Google Drive for exports

Google Earth Engine:
`https://earthengine.google.com/`

Code Editor:
`https://code.earthengine.google.com/`

## Simple Steps To Run It

1. Open Google Earth Engine Code Editor.
2. Copy and paste one script from this repository.
3. Check the `stateName`, year, and buffer settings.
4. Click `Run`.
5. View the map and printed outputs.
6. Open the `Tasks` tab.
7. Click `Run` on the export task.
8. Download the result from Google Drive when it finishes.

## Important Notes

- The default study area is `Osun`.
- A `10000` metre buffer is added around the state boundary.
- Most composites are built from a multi-year window, not from a single day image.
- Some scripts use a November to March seasonal filter to reduce cloud problems and improve consistency.
- The final maps are best used for broad change analysis, not as perfect ground truth.
- The two `*_error.js` files should be ignored unless they are repaired later.

## Good Use Cases

This repository can support class projects such as:

- measuring urban expansion
- comparing vegetation cover between years
- identifying changes in water and wetland areas
- showing long-term landscape change in Osun State

## Suggested Way To Explain Results

For non-technical presentation, it is safest to describe the outputs as:

"satellite-based land cover estimates showing broad patterns of change over time"

That wording is better than claiming the maps are exact field measurements.

## Summary

This repository is a time-series land cover mapping workflow for Osun State using Landsat and Google Earth Engine. The `years/` folder is mainly for creating clean yearly images, while `unsupervised-classifications/` is mainly for producing the final land cover maps that can be compared across years.
