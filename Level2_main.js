// ============================================================
// Level 2: Year/Month heatmap with daily temperature lines
//
// Same matrix as Level 1, limited to the most recent years. Each
// cell's background encodes the month's highest daily maximum or
// lowest daily minimum (click a cell to switch), and a mini line chart
// inside the cell shows the daily maximum and minimum temperature.
//
// Requires: d3.js and common.js. Drawn by app.js when Level 2 is selected.
// ============================================================

// ============================================================
// Level 2 configuration (shared settings are in common.js)
// ============================================================
const LEVEL2_CONFIG = {
  yearsToShow: 10,                 // only the most recent years are drawn

  // Matrix geometry (pixels)
  layout: {
    cellWidth: 97,
    cellHeight: 72,
    cellPadding: 0.2               // share of each band left as a gap
  },
  margin: { top: 30, right: 210, bottom: 20, left: 80 },

  // Mini line charts inside each cell
  miniChart: {
    daysInLongestMonth: 31,        // x axis runs from day 1 to this day
    temperatureDomain: [0, 40],    // shared y axis (°C), so cells are comparable
    inset: 3,                      // gap between the lines and the cell edge (pixels)
    lineWidth: 2,
    series: [
      { field: "maxTemperature", color: "#2ca25f" },   // daily maximum (green)
      { field: "minTemperature", color: "#a6cee3" }    // daily minimum (light blue)
    ]
  },

  // Colour legend, drawn to the right of the matrix like the reference:
  // coldest at the top, labelled only at the two ends
  legend: {
    orientation: "vertical",
    swatchLength: 22,
    swatchThickness: 22,
    headerLineHeight: 14,
    headerGap: 6,
    labelGap: 6,
    endLabels: ["0 Celsius", "40 Celsius"],
    offsetFromMatrix: 25,          // gap between the matrix and the legend
    offsetFromTop: 30              // room above the swatches for the header
  },

  tooltipSeparator: ", "           // "Date: 2012-04, max: 31 min: 28"
};

// ============================================================
// Data preparation
// ============================================================

/**
 * Keeps only the days that fall in the most recent years.
 * @param {Object[]} dailyRecords - one record per day
 * @param {number} numberOfYears - how many years to keep
 * @returns {Object[]} the daily records of those years
 */
function keepMostRecentYears(dailyRecords, numberOfYears) {
  const lastYear = d3.max(dailyRecords, day => day.date.getFullYear());
  const firstYear = lastYear - numberOfYears + 1;
  return dailyRecords.filter(day => day.date.getFullYear() >= firstYear);
}

/**
 * Summarises one month for Level 2: its extremes (for the background
 * colour and tooltip) plus its daily values (for the mini line chart).
 * @param {Object[]} daysInMonth - daily records of a single month
 * @returns {Object} {maxTemperature, minTemperature, days}, where days is
 *   a list of {dayOfMonth, maxTemperature, minTemperature} in date order
 */
function summariseMonthWithDays(daysInMonth) {
  const days = daysInMonth
    .map(day => ({
      dayOfMonth: day.date.getDate(),
      maxTemperature: day.maxTemperature,
      minTemperature: day.minTemperature
    }))
    .sort((dayA, dayB) => d3.ascending(dayA.dayOfMonth, dayB.dayOfMonth));

  return { ...summariseMonthExtremes(daysInMonth), days };
}

// ============================================================
// Scales
// ============================================================

/**
 * Builds the scales used inside one cell's mini line chart.
 * @param {Object} matrixScales - output of createMatrixScales
 * @returns {Object} {dayX: day of month -> x, temperatureY: temperature -> y}
 */
function createMiniChartScales(matrixScales) {
  const { miniChart } = LEVEL2_CONFIG;

  const dayX = d3.scaleLinear()
    .domain([1, miniChart.daysInLongestMonth])
    .range([miniChart.inset, matrixScales.x.bandwidth() - miniChart.inset]);

  // Hot at the top, cold at the bottom
  const temperatureY = d3.scaleLinear()
    .domain(miniChart.temperatureDomain)
    .range([matrixScales.y.bandwidth() - miniChart.inset, miniChart.inset]);

  return { dayX, temperatureY };
}

// ============================================================
// Drawing
// ============================================================

/**
 * Draws one group per month, positioned at its cell, holding a
 * background rectangle coloured by the initial mode. Months
 * without data get no group, so they stay blank.
 * @param {d3.Selection} chartArea - output of createChartArea
 * @param {Object[]} monthlyRecords - output of groupByMonth
 * @param {Object} matrixScales - output of createMatrixScales
 * @param {d3.ScaleThreshold} colorScale - output of createColorScale
 * @returns {d3.Selection} the cell groups
 */
function drawLevel2Cells(chartArea, monthlyRecords, matrixScales, colorScale) {
  const cells = chartArea.append("g")
    .attr("class", "cells")
    .selectAll("g")
    .data(monthlyRecords)
    .join("g")
    .attr("class", "cell")
    .attr("transform", record =>
      `translate(${matrixScales.x(record.year)},${matrixScales.y(record.month)})`);

  const backgrounds = cells.append("rect")
    .attr("class", "cell-background")
    .attr("width", matrixScales.x.bandwidth())
    .attr("height", matrixScales.y.bandwidth());

  colorByMode(backgrounds, colorScale, SHARED_CONFIG.initialMode, false);
  return cells;
}

/**
 * Draws the mini line chart in every cell: one line per series in
 * LEVEL2_CONFIG.miniChart.series (daily maximum and daily minimum).
 * The x direction is the day of the month, the y direction the temperature.
 * @param {d3.Selection} cells - output of drawLevel2Cells
 * @param {Object} miniChartScales - output of createMiniChartScales
 */
function drawDailyLines(cells, miniChartScales) {
  const { miniChart } = LEVEL2_CONFIG;

  miniChart.series.forEach(series => {
    const lineGenerator = d3.line()
      .x(day => miniChartScales.dayX(day.dayOfMonth))
      .y(day => miniChartScales.temperatureY(day[series.field]));

    cells.append("path")
      .attr("class", "daily-line")
      .attr("stroke", series.color)
      .attr("stroke-width", miniChart.lineWidth)
      .attr("d", record => lineGenerator(record.days));
  });
}

/**
 * Draws the colour legend to the right of the matrix.
 * @param {d3.Selection} chartArea - output of createChartArea
 * @param {Object} matrixScales - output of createMatrixScales
 * @returns {d3.Selection} the legend group
 */
function drawLevel2Legend(chartArea, matrixScales) {
  const { legend } = LEVEL2_CONFIG;
  const legendGroup = chartArea.append("g")
    .attr("class", "legend")
    .attr("transform",
      `translate(${matrixScales.innerWidth + legend.offsetFromMatrix},${legend.offsetFromTop})`);
  drawColorLegend(legendGroup, legend);
  return legendGroup;
}

// ============================================================
// Interaction
// ============================================================

/**
 * Finds the day whose point on the mini line chart is closest to the
 * mouse pointer.
 * @param {Object} record - the monthly record of the hovered cell
 * @param {MouseEvent} event - the mouse event over that cell
 * @param {Object} miniChartScales - output of createMiniChartScales
 * @returns {Object} one entry of record.days
 */
function findDayUnderPointer(record, event, miniChartScales) {
  // Pointer position inside the cell (its group is already moved to the cell)
  const [pointerX] = d3.pointer(event, event.currentTarget);
  const pointerDay = miniChartScales.dayX.invert(pointerX);
  return d3.least(record.days, day => Math.abs(day.dayOfMonth - pointerDay));
}

/**
 * Builds the Level 2 tooltip text: the month, plus the maximum and
 * minimum temperature of the day under the pointer, e.g.
 * "Date: 2012-04, max: 31 min: 28" near the end of April 2012.
 * @param {Object} record - the monthly record of the hovered cell
 * @param {MouseEvent} event - the mouse event over that cell
 * @param {Object} miniChartScales - output of createMiniChartScales
 * @returns {string} the tooltip text
 */
function formatLevel2TooltipText(record, event, miniChartScales) {
  const hoveredDay = findDayUnderPointer(record, event, miniChartScales);
  const hoveredValues = {
    year: record.year,
    month: record.month,
    maxTemperature: hoveredDay.maxTemperature,
    minTemperature: hoveredDay.minTemperature
  };
  return formatTooltipText(hoveredValues, LEVEL2_CONFIG.tooltipSeparator);
}

// ============================================================
// Level 2 entry point (called by app.js)
// ============================================================

/**
 * Builds the Level 2 chart piece by piece.
 * @param {Object[]} dailyRecords - output of loadDailyTemperatures
 */
function drawLevel2Heatmap(dailyRecords) {
  // Data: recent years only, one record per month with its daily values
  const recentDailyRecords = keepMostRecentYears(dailyRecords, LEVEL2_CONFIG.yearsToShow);
  const monthlyRecords = groupByMonth(recentDailyRecords, summariseMonthWithDays);

  // Scales and canvas
  const matrixScales = createMatrixScales(monthlyRecords, LEVEL2_CONFIG.layout);
  const miniChartScales = createMiniChartScales(matrixScales);
  const colorScale = createColorScale();
  const chartArea = createChartArea(matrixScales, LEVEL2_CONFIG.margin);

  // Visual elements
  drawMatrixAxes(chartArea, matrixScales);
  const cells = drawLevel2Cells(chartArea, monthlyRecords, matrixScales, colorScale);
  drawDailyLines(cells, miniChartScales);
  const legendGroup = drawLevel2Legend(chartArea, matrixScales);

  // Interaction: tooltip for the day under the pointer, click a cell to switch max / min
  attachTooltip(cells, (record, event) =>
    formatLevel2TooltipText(record, event, miniChartScales));
  attachModeSwitch(cells, legendGroup,
    newMode => colorByMode(cells.select(".cell-background"), colorScale, newMode, true));
}