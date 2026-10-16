// ============================================================
// app.js: page entry point
//
// Loads the data once, builds the Level 1 / Level 2 toggle, and
// draws whichever level is selected. Switching level clears the
// chart and draws the other one from the same data.
//
// Requires: d3.js, common.js, Level1_main.js and Level2_main.js
// (loaded in that order by index.html)
// ============================================================

// ============================================================
// Page configuration
// ============================================================
const APP_CONFIG = {
  levelToggle: "#level-toggle",    // container for the level buttons
  activeButtonClass: "active",     // CSS class of the selected button

  // One button per level. To add a level, add an entry here.
  levels: [
    { id: "level1", label: "Level 1: Monthly heatmap", draw: drawLevel1Heatmap },
    { id: "level2", label: "Level 2: Daily lines (last 10 years)", draw: drawLevel2Heatmap }
  ],
  initialLevelId: "level1"
};

/**
 * Finds a level's settings by its id.
 * @param {string} levelId - an id from APP_CONFIG.levels
 * @returns {Object} the matching entry of APP_CONFIG.levels
 */
function findLevel(levelId) {
  return APP_CONFIG.levels.find(level => level.id === levelId);
}

/**
 * Clears the chart, draws the chosen level, and highlights its button.
 * @param {string} levelId - an id from APP_CONFIG.levels
 * @param {Object[]} dailyRecords - output of loadDailyTemperatures
 */
function showLevel(levelId, dailyRecords) {
  clearChart();
  findLevel(levelId).draw(dailyRecords);

  d3.select(APP_CONFIG.levelToggle)
    .selectAll("button")
    .classed(APP_CONFIG.activeButtonClass, level => level.id === levelId);
}

/**
 * Creates one toggle button per level; clicking a button shows that level.
 * @param {Object[]} dailyRecords - output of loadDailyTemperatures
 */
function createLevelToggle(dailyRecords) {
  d3.select(APP_CONFIG.levelToggle)
    .selectAll("button")
    .data(APP_CONFIG.levels)
    .join("button")
    .attr("type", "button")
    .text(level => level.label)
    .on("click", (event, level) => showLevel(level.id, dailyRecords));
}

/** Loads the data, builds the toggle, and shows the first level. */
async function startApp() {
  const dailyRecords = await loadDailyTemperatures();
  createLevelToggle(dailyRecords);
  showLevel(APP_CONFIG.initialLevelId, dailyRecords);
}

startApp();
