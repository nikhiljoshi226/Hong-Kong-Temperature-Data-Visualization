// ============================================================
// Level 1: Year/Month heatmap of Hong Kong monthly temperature
//
// Each cell is one month of one year. Its colour encodes either the
// highest daily maximum or the lowest daily minimum of that month.
// Clicking any cell switches between the two.
//
// Requires: d3.js and common.js. Drawn by app.js when Level 1 is selected.
// ============================================================

// ============================================================
// Level 1 configuration (shared settings are in common.js)
// ============================================================
const LEVEL1_CONFIG = {
  // Matrix geometry (pixels)
  layout: {
    cellWidth: 41,
    cellHeight: 37,
    cellPadding: 0.2               // share of each band left as a gap
  },
  margin: { top: 30, right: 20, bottom: 90, left: 80 },

  // Colour legend, drawn below the matrix
  legend: {
    orientation: "horizontal",
    swatchLength: 40,
    swatchThickness: 14,
    headerLineHeight: 14,
    headerGap: 6,
    labelGap: 4,
    offsetFromMatrix: 45           // gap between the matrix and the swatches
  },

  tooltipSeparator: "; "           // "Date: 2002-03; max: 28 min: 14"
};

// ============================================================
// Drawing
// ============================================================

/**
 * Draws one rectangle per month, coloured by the initial mode.
 * Months without data get no rectangle, so they stay blank.
 * @param {d3.Selection} chartArea - output of createChartArea
 * @param {Object[]} monthlyRecords - output of groupByMonth
 * @param {Object} matrixScales - output of createMatrixScales
 * @param {d3.ScaleThreshold} colorScale - output of createColorScale
 * @returns {d3.Selection} the cell rectangles
 */
function drawLevel1Cells(chartArea, monthlyRecords, matrixScales, colorScale) {
  const cells = chartArea.append("g")
    .attr("class", "cells")
    .selectAll("rect")
    .data(monthlyRecords)
    .join("rect")
    .attr("class", "cell")
    .attr("x", record => matrixScales.x(record.year))
    .attr("y", record => matrixScales.y(record.month))
    .attr("width", matrixScales.x.bandwidth())
    .attr("height", matrixScales.y.bandwidth());

  colorByMode(cells, colorScale, SHARED_CONFIG.initialMode, false);
  return cells;
}

/**
 * Draws the colour legend below the matrix, aligned with its left edge.
 * @param {d3.Selection} chartArea - output of createChartArea
 * @param {Object} matrixScales - output of createMatrixScales
 * @returns {d3.Selection} the legend group
 */
function drawLevel1Legend(chartArea, matrixScales) {
  const { legend } = LEVEL1_CONFIG;
  const legendGroup = chartArea.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(0,${matrixScales.innerHeight + legend.offsetFromMatrix})`);
  drawColorLegend(legendGroup, legend);
  return legendGroup;
}

// ============================================================
// Level 1 entry point (called by app.js)
// ============================================================

/**
 * Builds the Level 1 chart piece by piece.
 * @param {Object[]} dailyRecords - output of loadDailyTemperatures
 */
function drawLevel1Heatmap(dailyRecords) {
  // Data: one record per month with its extremes
  const monthlyRecords = groupByMonth(dailyRecords, summariseMonthExtremes);

  // Scales and canvas
  const matrixScales = createMatrixScales(monthlyRecords, LEVEL1_CONFIG.layout);
  const colorScale = createColorScale();
  const chartArea = createChartArea(matrixScales, LEVEL1_CONFIG.margin);

  // Visual elements
  drawMatrixAxes(chartArea, matrixScales);
  const cells = drawLevel1Cells(chartArea, monthlyRecords, matrixScales, colorScale);
  const legendGroup = drawLevel1Legend(chartArea, matrixScales);

  // Interaction: hover tooltip, click a cell to switch between max and min
  attachTooltip(cells, record => formatTooltipText(record, LEVEL1_CONFIG.tooltipSeparator));
  attachModeSwitch(cells, legendGroup,
    newMode => colorByMode(cells, colorScale, newMode, true));
}

