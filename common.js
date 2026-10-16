// ============================================================
// common.js: building blocks shared by both heatmap levels
//
// Level 1 and Level 2 draw the same Year/Month matrix, so the data
// loading, scales, axes, colour legend, tooltip and max/min switch
// live here once. Each level's own file only adds what is specific
// to it (cell contents, layout sizes, legend placement).
// ============================================================

// ============================================================
// Shared configuration
// ============================================================
const SHARED_CONFIG = {
  // Data source
  dataFile: "temperature_daily.csv",
  dateFormat: "%Y-%m-%d",          // format of the "date" column in the CSV
  tooltipDateFormat: "%Y-%m",      // how a month is written in the tooltip

  // Page elements the charts attach to
  chartContainer: "#chart",
  tooltipElement: "#tooltip",

  // Row labels, in calendar order
  monthNames: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],

  // Colour scale: temperatures below colorThresholds[i] get colors[i],
  // so there must be exactly one more colour than thresholds.
  colorThresholds: [4, 8, 11, 15, 18, 22, 25, 29, 32, 36],
  colors: [
    "#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598", "#ffffbf",
    "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"
  ],

  // Values the cells can be coloured by. Clicking a cell cycles
  // through them in this order, so adding an entry adds a new mode.
  modes: {
    max: { field: "maxTemperature", label: "Maximum temperature (°C)" },
    min: { field: "minTemperature", label: "Minimum temperature (°C)" }
  },
  initialMode: "max",
  switchHint: "Click any cell to switch max / min",

  // Tooltip position relative to the mouse pointer (pixels)
  tooltipOffset: { x: 12, y: -28 },

  transitionDuration: 400          // colour change animation (milliseconds)
};

// ============================================================
// Data loading and preparation
// ============================================================

/**
 * Converts one raw CSV row (all strings) into typed values.
 * @param {Object} rawRow - a row as read from the CSV file
 * @returns {Object} the date as a Date, temperatures as numbers
 */
function parseDailyRow(rawRow) {
  const parseDate = d3.timeParse(SHARED_CONFIG.dateFormat);
  return {
    date: parseDate(rawRow.date),
    maxTemperature: +rawRow.max_temperature,
    minTemperature: +rawRow.min_temperature
  };
}

/**
 * Loads the daily temperature CSV file.
 * @returns {Promise<Object[]>} one record per day
 */
function loadDailyTemperatures() {
  return d3.csv(SHARED_CONFIG.dataFile, parseDailyRow);
}

/**
 * Summarises the days of one month by their extremes: the hottest
 * daily maximum and the coldest daily minimum.
 * @param {Object[]} daysInMonth - daily records of a single month
 * @returns {Object} {maxTemperature, minTemperature}
 */
function summariseMonthExtremes(daysInMonth) {
  return {
    maxTemperature: d3.max(daysInMonth, day => day.maxTemperature),
    minTemperature: d3.min(daysInMonth, day => day.minTemperature)
  };
}

/**
 * Groups daily records into one record per year and month.
 * @param {Object[]} dailyRecords - one record per day
 * @param {Function} summariseMonth - turns the days of one month into
 *   an object of summary fields (e.g. summariseMonthExtremes)
 * @returns {Object[]} records of {year, month, ...summary fields},
 *   where month runs from 0 (January) to 11 (December)
 */
function groupByMonth(dailyRecords, summariseMonth) {
  const groupedByYearAndMonth = d3.rollup(
    dailyRecords,
    summariseMonth,
    day => day.date.getFullYear(),
    day => day.date.getMonth()
  );

  // Flatten the nested Map (year -> month -> summary) into a plain array
  const monthlyRecords = [];
  groupedByYearAndMonth.forEach((monthsOfYear, year) => {
    monthsOfYear.forEach((summary, month) => {
      monthlyRecords.push({ year, month, ...summary });
    });
  });
  return monthlyRecords;
}

// ============================================================
// Scales
// ============================================================

/**
 * Builds the band scales that place each month in the matrix:
 * one column per year and one row per month.
 * @param {Object[]} monthlyRecords - output of groupByMonth
 * @param {Object} layout - {cellWidth, cellHeight, cellPadding}
 * @returns {Object} {x, y, innerWidth, innerHeight}
 */
function createMatrixScales(monthlyRecords, layout) {
  const years = [...new Set(monthlyRecords.map(record => record.year))].sort(d3.ascending);
  const monthIndices = d3.range(SHARED_CONFIG.monthNames.length);

  const innerWidth = years.length * layout.cellWidth;
  const innerHeight = monthIndices.length * layout.cellHeight;

  const x = d3.scaleBand()
    .domain(years)
    .range([0, innerWidth])
    .padding(layout.cellPadding);

  const y = d3.scaleBand()
    .domain(monthIndices)
    .range([0, innerHeight])
    .padding(layout.cellPadding);

  return { x, y, innerWidth, innerHeight };
}

/**
 * Builds the scale that turns a temperature into a colour, in
 * discrete steps.
 * @returns {d3.ScaleThreshold} temperature -> colour
 */
function createColorScale() {
  return d3.scaleThreshold()
    .domain(SHARED_CONFIG.colorThresholds)
    .range(SHARED_CONFIG.colors);
}

// ============================================================
// Drawing
// ============================================================

/**
 * Removes whatever chart is currently drawn and hides the tooltip,
 * so another chart can be drawn in its place.
 */
function clearChart() {
  d3.select(SHARED_CONFIG.chartContainer).selectAll("*").remove();
  d3.select(SHARED_CONFIG.tooltipElement).style("opacity", 0);
}

/**
 * Creates the SVG canvas and the group that holds the chart.
 * @param {Object} matrixScales - output of createMatrixScales
 * @param {Object} margin - {top, right, bottom, left} in pixels
 * @returns {d3.Selection} the group, already shifted by the margins
 */
function createChartArea(matrixScales, margin) {
  return d3.select(SHARED_CONFIG.chartContainer)
    .append("svg")
    .attr("width", matrixScales.innerWidth + margin.left + margin.right)
    .attr("height", matrixScales.innerHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
}

/**
 * Draws the year axis along the top and the month axis down the left.
 * @param {d3.Selection} chartArea - output of createChartArea
 * @param {Object} matrixScales - output of createMatrixScales
 */
function drawMatrixAxes(chartArea, matrixScales) {
  chartArea.append("g")
    .attr("class", "axis axis-year")
    .call(d3.axisTop(matrixScales.x));

  chartArea.append("g")
    .attr("class", "axis axis-month")
    .call(d3.axisLeft(matrixScales.y)
      .tickFormat(monthIndex => SHARED_CONFIG.monthNames[monthIndex]));
}

/**
 * Fills shapes with the colour of the given mode's temperature.
 * @param {d3.Selection} shapes - shapes bound to monthly records
 * @param {d3.ScaleThreshold} colorScale - output of createColorScale
 * @param {string} mode - a key of SHARED_CONFIG.modes
 * @param {boolean} animate - whether to fade to the new colour
 */
function colorByMode(shapes, colorScale, mode, animate) {
  const temperatureField = SHARED_CONFIG.modes[mode].field;
  const target = animate
    ? shapes.transition().duration(SHARED_CONFIG.transitionDuration)
    : shapes;
  target.attr("fill", record => colorScale(record[temperatureField]));
}

/**
 * Builds the text labels of a colour legend.
 * - With legendConfig.endLabels: one label at the cold end and one at
 *   the hot end (e.g. "0 Celsius" ... "40 Celsius").
 * - Otherwise: each threshold temperature, placed on the border
 *   between the two swatches it separates.
 * @param {Object} legendConfig - see drawColorLegend
 * @returns {Object[]} labels of {text, position}, where position is the
 *   distance along the legend in pixels
 */
function getLegendLabels(legendConfig) {
  const legendLength = SHARED_CONFIG.colors.length * legendConfig.swatchLength;

  if (legendConfig.endLabels) {
    const [coldLabel, hotLabel] = legendConfig.endLabels;
    return [
      { text: coldLabel, position: 0 },
      { text: hotLabel, position: legendLength }
    ];
  }

  return SHARED_CONFIG.colorThresholds.map((threshold, index) => ({
    text: threshold,
    position: (index + 1) * legendConfig.swatchLength
  }));
}

/**
 * Chooses how legend labels sit relative to their position.
 * Vertical end labels hang just past each end of the bar, as in the
 * Level 2 reference; vertical threshold labels are centred on their
 * border; horizontal labels always hang below the bar.
 * @param {boolean} isVertical - whether the legend runs top to bottom
 * @param {Object} legendConfig - see drawColorLegend
 * @returns {string} an SVG dominant-baseline value
 */
function getLabelBaseline(isVertical, legendConfig) {
  if (isVertical && !legendConfig.endLabels) {
    return "middle";
  }
  return "hanging";
}

/**
 * Draws a stepped colour legend: a two-line header (current mode and
 * how to switch it), one swatch per colour (coldest first), and the
 * value labels. Works horizontally or vertically.
 * @param {d3.Selection} legendGroup - group already moved to where the swatches start
 * @param {Object} legendConfig - {orientation: "horizontal" | "vertical",
 *   swatchLength (along the legend), swatchThickness (across it),
 *   headerLineHeight, headerGap (space between header and swatches),
 *   labelGap (space between swatches and labels),
 *   endLabels (optional [cold text, hot text])}
 * @returns {number} the legend's length along its orientation (pixels)
 */
function drawColorLegend(legendGroup, legendConfig) {
  const isVertical = legendConfig.orientation === "vertical";
  const { swatchLength, swatchThickness, labelGap, headerGap, headerLineHeight } = legendConfig;

  // Header: the mode line is filled in by showModeInLegend
  legendGroup.append("text")
    .attr("class", "legend-title")
    .attr("y", -headerGap - headerLineHeight);
  legendGroup.append("text")
    .attr("class", "legend-hint")
    .attr("y", -headerGap)
    .text(SHARED_CONFIG.switchHint);

  // Swatches: the i-th one starts at i * swatchLength along the legend
  const positionAlong = index => index * swatchLength;
  legendGroup.selectAll("rect")
    .data(SHARED_CONFIG.colors)
    .join("rect")
    .attr("x", (swatchColor, index) => (isVertical ? 0 : positionAlong(index)))
    .attr("y", (swatchColor, index) => (isVertical ? positionAlong(index) : 0))
    .attr("width", isVertical ? swatchThickness : swatchLength)
    .attr("height", isVertical ? swatchLength : swatchThickness)
    .attr("fill", swatchColor => swatchColor);

  // Value labels, beside (vertical) or below (horizontal) the swatches
  const labelAcross = swatchThickness + labelGap;
  legendGroup.selectAll(".legend-label")
    .data(getLegendLabels(legendConfig))
    .join("text")
    .attr("class", "legend-label")
    .attr("x", label => (isVertical ? labelAcross : label.position))
    .attr("y", label => (isVertical ? label.position : labelAcross))
    .attr("text-anchor", isVertical ? "start" : "middle")
    .attr("dominant-baseline", getLabelBaseline(isVertical, legendConfig))
    .text(label => label.text);

  return SHARED_CONFIG.colors.length * swatchLength;
}

/**
 * Writes the name of the mode being shown into the legend header.
 * @param {d3.Selection} legendGroup - a group drawn by drawColorLegend
 * @param {string} mode - a key of SHARED_CONFIG.modes
 */
function showModeInLegend(legendGroup, mode) {
  legendGroup.select(".legend-title").text(SHARED_CONFIG.modes[mode].label);
}

// ============================================================
// Interaction
// ============================================================

/**
 * Builds the tooltip text for one month, e.g.
 * "Date: 2002-03; max: 28 min: 14".
 * @param {Object} record - one monthly record
 * @param {string} separator - text between the date and the values
 * @returns {string} the tooltip text
 */
function formatTooltipText(record, separator) {
  const formatMonth = d3.timeFormat(SHARED_CONFIG.tooltipDateFormat);
  const monthLabel = formatMonth(new Date(record.year, record.month));
  return `Date: ${monthLabel}${separator}` +
         `max: ${record.maxTemperature} min: ${record.minTemperature}`;
}

/**
 * Shows a tooltip that follows the mouse while it is over a cell.
 * The text is rebuilt on every mouse move, so it can depend on where
 * inside the cell the pointer is (Level 2 uses this to show the day
 * under the pointer).
 * @param {d3.Selection} cells - elements bound to monthly records
 * @param {Function} getText - (record, event) -> the tooltip text
 */
function attachTooltip(cells, getText) {
  const tooltip = d3.select(SHARED_CONFIG.tooltipElement);

  const showAtPointer = (event, record) => tooltip
    .text(getText(record, event))
    .style("opacity", 1)
    .style("left", `${event.pageX + SHARED_CONFIG.tooltipOffset.x}px`)
    .style("top", `${event.pageY + SHARED_CONFIG.tooltipOffset.y}px`);

  cells
    .on("mouseover", showAtPointer)
    .on("mousemove", showAtPointer)
    .on("mouseout", () => tooltip.style("opacity", 0));
}

/**
 * Returns the mode that follows the given one, wrapping around.
 * @param {string} mode - a key of SHARED_CONFIG.modes
 * @returns {string} the next key
 */
function getNextMode(mode) {
  const modeKeys = Object.keys(SHARED_CONFIG.modes);
  return modeKeys[(modeKeys.indexOf(mode) + 1) % modeKeys.length];
}

/**
 * Makes a click on any cell switch to the next mode, keeping track
 * of the current mode and keeping the legend header in step.
 * @param {d3.Selection} cells - elements to listen for clicks on
 * @param {d3.Selection} legendGroup - a group drawn by drawColorLegend
 * @param {Function} onModeChange - recolours the chart; called with the new mode
 */
function attachModeSwitch(cells, legendGroup, onModeChange) {
  let currentMode = SHARED_CONFIG.initialMode;
  showModeInLegend(legendGroup, currentMode);

  cells.on("click", () => {
    currentMode = getNextMode(currentMode);
    showModeInLegend(legendGroup, currentMode);
    onModeChange(currentMode);
  });
}