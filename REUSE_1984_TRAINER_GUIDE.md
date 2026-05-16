# Reusing the 1984 Unsupervised Trainer for Other Years

## Problem Summary

This project already has:

- `years/*.js` scripts that build Landsat composites for individual years
- `unsupervised-classifications/1984.js` that performs unsupervised LULC classification for the 1984 composite

The goal is to reuse the **1984 unsupervised trainer** for the other valid year composites, instead of building a separate trainer from scratch for each year.

Two files in `years/` are intentionally problematic and should be ignored for now:

- `years/1987_1991_error.js`
- `years/1991_1997_error.js`

The valid year scripts to target are:

- `years/1984.js`
- `years/1999.js`
- `years/2004.js`
- `years/2009.js`
- `years/2014.js`
- `years/2019.js`
- `years/2024.js`

Since `unsupervised-classifications/1984.js` already exists, the practical reuse target is mainly:

- `1999`
- `2004`
- `2009`
- `2014`
- `2019`
- `2024`

## What "Reuse the 1984 Trainer" Should Mean

The 1984 classification script currently does these major steps:

1. Build the buffered ROI for the selected state.
2. Build the 1984 Landsat composite.
3. Select the classification bands:
   - `Blue`
   - `Green`
   - `Red`
   - `NIR`
   - `SWIR1`
   - `SWIR2`
   - `NDVI`
   - `NDBI`
   - `MNDWI`
4. Standardize those bands.
5. Sample pixels from the standardized image.
6. Train a `wekaKMeans` clusterer with `10` clusters.
7. Apply the clusterer.
8. Remap clusters into final LULC classes.
9. Smooth, visualize, calculate area, and export.

Reusing the 1984 trainer should therefore mean:

- the cluster model is trained once from the 1984 workflow
- the same trained clusterer is then applied to the other year composites
- the same input band order is preserved
- the same cluster-to-LULC remap is preserved unless interpretation proves it no longer fits

## Important Constraint

This will only work correctly if every target year produces the same predictor bands with the same names and order.

That condition is already mostly satisfied in the current `years/` scripts:

- Landsat 5, 7, and 8 composites are all renamed into the same core reflectance bands
- spectral indices are also added with the same names

So the classification input schema can remain consistent across all usable years.

## Main Implementation Idea

The clean implementation is to separate the 1984 script into two logical parts:

1. **Training source**
   - Build the 1984 composite
   - Derive the standardization inputs
   - Sample pixels from 1984
   - Train the k-means clusterer on 1984 only

2. **Reusable classification workflow**
   - Accept any yearly composite
   - Ensure it has the same nine classification bands
   - Standardize the image in a consistent way
   - Apply the already-trained 1984 clusterer
   - Apply the same remap, smoothing, area calculation, visualization, and export logic

## Recommended Implementation Instructions

### 1. Do not touch the two error files

Skip these completely:

- `years/1987_1991_error.js`
- `years/1991_1997_error.js`

They should not be included in any batch workflow or shared helper until their composite issues are fixed.

### 2. Keep one shared classification band list

Use exactly the same band list already used in `unsupervised-classifications/1984.js`:

- `Blue`
- `Green`
- `Red`
- `NIR`
- `SWIR1`
- `SWIR2`
- `NDVI`
- `NDBI`
- `MNDWI`

Every year-specific script must expose an image with these bands before classification starts.

### 3. Preserve the 1984 training configuration

The reusable trainer should keep the same 1984 settings unless there is a deliberate reason to change them:

- sampling region: the same ROI
- sample size: `5000`
- seed: `42`
- cluster count: `10`

If any of these values are changed later, the remap table will likely need to be reinterpreted.

### 4. Treat the 1984 clusterer as the source model

The key requirement is:

- train the clusterer only from 1984
- do not retrain separately for 1999, 2004, 2009, 2014, 2019, or 2024

If each year is retrained independently, then the cluster IDs will drift and the 1984 remap will no longer be reliably reusable.

### 5. Standardization must be handled carefully

This is the most important implementation decision.

The current 1984 script standardizes the image with statistics computed from the image being classified. If the goal is true reuse of the 1984 trainer, the safer rule is:

- compute the training standardization statistics from the 1984 input used for training
- reuse those same 1984 mean and standard deviation values when preparing the later years for inference

Why this matters:

- if every year is standardized with its own separate statistics, the feature space changes year by year
- a clusterer trained in 1984 may then receive differently scaled inputs in later years
- that weakens the idea of using one stable trainer across time

So the preferred approach is:

- 1984 standardization stats define the reference feature space
- all later years are transformed into that same feature space before clustering

### 6. Reuse the same cluster-to-class remap first

The 1984 script currently remaps cluster IDs:

- clusters `0,1,2,3,4,5,6,7,8,9`
- to classes `2,2,3,1,4,2,5,3,4,1`

That remap should be reused first for all later years because it is part of what makes the 1984 trainer reusable.

However, this should be treated as an initial operational rule, not an unquestionable truth.

### 7. Validate visually before trusting final maps

Even if the same trainer is reused, the resulting class meaning should still be checked visually for each year:

- compare clusters and final LULC against RGB composites
- pay special attention to built-up, wetland, and bare land confusion
- inspect water and vegetation consistency around known stable locations

If the cluster meaning changes too much in later years, the issue is not necessarily the composite. It may mean the 1984-trained model is not temporally stable enough for that year range.

### 8. Reuse the post-classification steps unchanged

The following parts of the 1984 workflow should be reused consistently across years:

- focal smoothing with radius `1` pixel
- the same five-class palette
- area calculation using `pixelArea()`
- export naming that includes `stateName` and the target year

This keeps all outputs comparable.

### 9. Prefer shared helpers over copied logic

The best long-term structure is not to duplicate the full 1984 script into every year file.

Instead, implementation should move toward:

- one helper for building or supplying yearly composites
- one helper for training the 1984 clusterer
- one helper for applying the trained clusterer to any valid year image

That reduces inconsistency and makes future fixes much easier.

## Suggested Target Workflow

For each valid target year, the implementation should conceptually do this:

1. Build or load the yearly composite.
2. Ensure the composite contains the nine required classification bands.
3. Apply the 1984-derived standardization parameters.
4. Apply the clusterer trained from 1984 samples.
5. Remap cluster IDs using the existing 1984 remap.
6. Smooth the final class image.
7. Display raw clusters and final LULC.
8. Compute grouped area statistics.
9. Export the classified raster.

## What Not to Do

- Do not use the two `_error.js` year files.
- Do not retrain k-means independently for each year if the objective is reuse of the 1984 trainer.
- Do not change band order between years.
- Do not standardize later years in a way that breaks compatibility with the 1984-trained feature space.
- Do not assume the remap is universally correct without visual checks.

## Likely Risks

### Temporal drift

A model trained on 1984 may become less reliable for 2019 or 2024 because land surface patterns, urban density, and sensor behavior differ over time.

### Sensor differences

Although the scripts harmonize Landsat 5, 7, and 8 into common band names, perfect equivalence is still not guaranteed.

### Standardization mismatch

This is the highest implementation risk. If the 1984 trainer is applied to features scaled differently from the training data, the output clusters may become unstable.

### Remap instability

Even with a reused clusterer, cluster meaning may shift enough that the 1984 cluster-to-class remap becomes partially unreliable for later years.

## Best Interpretation of the Task

The most technically correct interpretation is:

- use 1984 to define the training samples, feature scaling reference, cluster model, and initial remap
- apply that same trained unsupervised model to the other valid yearly composites
- skip the two known broken year scripts
- keep validation steps in place so results can still be checked year by year

## Files Relevant to the Future Implementation

- `unsupervised-classifications/1984.js`
- `years/1984.js`
- `years/1999.js`
- `years/2004.js`
- `years/2009.js`
- `years/2014.js`
- `years/2019.js`
- `years/2024.js`

## Final Instruction for the Implementer

When implementation begins, the developer should first refactor the logic conceptually around a single 1984-trained clusterer and a reusable classification pipeline, rather than copying the whole 1984 script into each year manually. The implementation should explicitly skip the two error-named year files and should preserve band schema, standardization compatibility, cluster count, seed, and remap behavior unless a documented validation step justifies a change.
