# 1984.js Documentation

## Overview
`1984.js` is a reusable unsupervised Landsat LULC classification script for Google Earth Engine.
It is written to train a KMeans clusterer on a 1984 Landsat composite and then apply that same trained model to any supported target year.

## Purpose
The script is designed to:
- build annual Landsat composites for Nigeria state-level analysis
- standardize the same set of spectral bands across years
- train a `wekaKMeans` clusterer only on 1984 data
- apply the trained clusterer to later years without retraining
- remap raw cluster IDs into a final LULC classification
- smooth and export the final classification and cluster outputs

## What it achieves
The script achieves a consistent, reusable classification workflow by:
- using the same feature band list for all supported years
- computing 1984 standardization statistics and reusing them for later years
- fixing the clusterer to the 1984 training model so cluster IDs do not drift year-to-year
- preserving the existing remap table from 1984 to final LULC labels
- reducing duplication by performing training and inference in the same file with shared helper logic

## Supported years
The script currently supports the following `targetYear` values:
- `1984`
- `1999`
- `2004`
- `2009`
- `2014`
- `2019`
- `2024`

Two known broken year scripts are intentionally excluded:
- `1987_1991_error.js`
- `1991_1997_error.js`

## Main workflow
1. Define the target state and buffered ROI.
2. Select sensor-specific settings for Landsat 5, 7, and 8.
3. Build a composite for the target year from the appropriate Landsat collection.
4. Rename and scale surface reflectance bands to a shared band schema.
5. Add three spectral indices: `NDVI`, `NDBI`, `MNDWI`.
6. Train a 10-cluster `wekaKMeans` model using 1984 samples only.
7. Standardize the target-year image using 1984 mean and standard deviation values.
8. Apply the trained clusterer to the target-year image.
9. Remap cluster IDs to LULC classes.
10. Smooth the resulting LULC map with a focal mode filter.
11. Visualize and export results.

## Important implementation details
- `classificationBands` is the required band order:
  - `Blue`, `Green`, `Red`, `NIR`, `SWIR1`, `SWIR2`, `NDVI`, `NDBI`, `MNDWI`
- `reflectanceBands` are the core optical bands used for scaling.
- `sampleSize` is set to `5000` and `seed` is `42` for reproducible sampling.
- 1984 standardization stats are calculated once and reused for all later years.
- The cluster-to-class remap is:
  - raw clusters `[0,1,2,3,4,5,6,7,8,9]`
  - to classes `[2,2,3,1,4,2,5,3,4,1]`
- Final LULC smoothing uses `focal_mode` with a radius of `1` pixel.

## Output
The script exports two images to Google Drive:
- final smoothed LULC map (`stateName_targetYear_LULC`)
- raw cluster map (`stateName_targetYear_Clusters`)

It also prints diagnostics including:
- ROI info
- target year and training config
- training standardization statistics
- cluster frequency histogram
- area statistics by class
- a static class name mapping

## Limitations
- The trained model is only as stable as the 1984 feature space; later years may diverge due to sensor differences, landcover change, or temporal drift.
- The remap table is inherited from 1984 and may not be optimal for all later years.
- The script assumes the same band names and order are present in each target year composite.
- This implementation trains the model inside the same script rather than loading a saved Earth Engine classifier asset.
- If any later year image has missing bands or unexpected data gaps, classification may fail.
- The composite building process uses `.median()` without more advanced quality filtering beyond simple cloud and saturation masks.

## Notes for reuse and extension
- To make this more modular, the 1984 model and stats can be exported as a saved classifier asset, then loaded in separate year-specific scripts.
- A shared module could also be created to centralize composite building, standardization, and remapping logic.
- Visual validation is recommended for each target year before trusting the final LULC map.

## User configuration
The following variables can be adjusted at the top of the script:
- `stateName` (default: `'Osun'`)
- `bufferDistance` (default: `10000` meters)
- `targetYear` (must be one of the supported years)

## Recommended usage
- Run the script first for `targetYear = '1984'` to verify training and stats.
- Then change `targetYear` to another supported value and run again.
- Inspect the printed statistics and map layers to compare cluster patterns across years.
- If desired, refactor later into separate training and inference scripts using Earth Engine assets.
