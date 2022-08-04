#!/usr/bin/env node

const { spawn } = require('cross-spawn');
const { platform, exit } = require('node:process');
const fs = require('fs');
const path = require('path');
const openBrowser = require('react-dev-utils/openBrowser');

// Path of bundle analyzer directory
const analyzerPath = path.join(__dirname, "advanced-bundle-analyzer");
// Path of Next UI app
const uiPath = path.join(__dirname, "suggestions_ui");

// Default configuration
const configStr =
`{
  /* General */
  "appStart": "npm start",                      /* Command to start webapp */
  "devToolsHeadless": true,                     /* Run DevTools in Headless mode */
  "browserHeadless": true,                      /* Run Browser in Headless mode */
  "devToolsDebug": false,                       /* Debug Log in DevTools */
  "allowUserInteraction": false,                /* Allows user to interact with webpage */
  "extractKey": "Escape",                       /* Key that initiates render tree extraction */
  "filterSuggestions": true,                    /* Filter suggestions to keep only functions returning JSX */

  /* Render Tree */
  "renderTreeFile": "renderTree.json",          /* Name of the file containing information about render tree */
  "refreshConnection": 1000,                    /* Time (in ms) before retrying to connect to DevTools or webapp */
  "checkFile": 1000,                            /* Time interval (in ms) to check if render tree has been extracted and saved */
  "renderTreeWait": 1000,                       /* Time (in ms) after which DevTools is initialized and render tree must be extracted */
  "updateFilters": 1000,                        /* Time (in ms) to wait for DevTools to filter out unnecessary components */

  /* Data Generation and Suggestions UI */
  "analyzeRoute": "http://localhost:3000",      /* Route that is to be analyzed */
  "dataGenWait": 500,                           /* Time (in ms) after which render tree is extracted and data.json must be prepared */
  "uiPort": 4242,                               /* Port number on which suggestions UI will be run */
  "openUI": true                                /* Opens Suggestion UI in browser */
}`

// Remove comments given a string
const removeComments = (str) => str.replace(/([^:]\/\/.*|\/\*((.|\r\n|\s)*?)\*\/)/gm, "");

// Convert string to config object
const strToConf = (str) => JSON.parse(removeComments(str));

// Main function to run the analyzer pipeline
const runAnalyzer = (config) => {
  // If the render tree file from previous run exists
  if(fs.existsSync(config.renderTreeFile))
    // Delete the file
    fs.unlinkSync(config.renderTreeFile);

  // If command to start the app is valid
  if(config.appStart !== "") {
    console.log("Starting webapp...\n");
    // Start the app
    const [appCmd, ...appArgs] = config.appStart.split(" ");
    const appStart = spawn(appCmd, appArgs,
      {
        env: {
          ...process.env,
          // Disable React from automatically opening in the browser
          BROWSER: 'none'
        },
        shell: true,
        // Inherit the stdio to show output of build
        stdio: "inherit"
      }
    );
  }

  // Using date to get a unique name for extract signal file
  const extractSignalFile = `${new Date().getTime()}.tmp`;

  // Start DevTools
  if(config.devToolsHeadless)
    console.log("Starting DevTools in Headless Mode...");
  else
    console.log("Starting DevTools without Headless Mode...");
  const devtools = spawn("npm", ["run", "devtools"],
    {
      cwd: analyzerPath,
      env: {
        ...process.env,
        RENDER_TREE_PATH: path.resolve(),
        RENDER_TREE_FILE: config.renderTreeFile,
        RENDER_TREE_WAIT: config.renderTreeWait,
        DEVTOOLS_HEADLESS: config.devToolsHeadless,
        DEVTOOLS_DEBUG: config.devToolsDebug,
        UPDATE_FILTERS: config.updateFilters,
        EXTRACT_SIGNAL_FILE: extractSignalFile
      },
      shell: true
    }
  );

  devtools.on("close", (code) => {
    if(code) {
      console.log("Failed to run React DevTools:", code);
    }
    else
      console.log("DevTools exited successfully!");
  });

  // Start Puppeteer
  if(config.browserHeadless)
    console.log("Starting Puppeteer in Headless Mode...");
  else
    console.log("Starting Puppeteer without Headless Mode...");
  
  const puppeteer = spawn("npm", ["run", "puppeteer"],
    {
      cwd: analyzerPath,
      env: {
        ...process.env,
        RENDER_TREE_PATH: path.resolve(),
        RENDER_TREE_FILE: config.renderTreeFile,
        ANALYZE_ROUTE: config.analyzeRoute,
        REFRESH_CONN: config.refreshConnection,
        BROWSER_HEADLESS: config.browserHeadless,
        ALLOW_USER_INTERACTION: config.allowUserInteraction,
        EXTRACT_KEY: config.extractKey,
        EXTRACT_SIGNAL_FILE: extractSignalFile
      },
      shell: true
    }
  );

  puppeteer.on("close", (code) => {
    if(code === 0) {
      console.log("Puppeteer exited successfully!");
      // Browser exited and render tree file successfully created
      // Start the data generation process after desired timeout
      setTimeout(() => startDataGen(config), config.dataGenWait);
    }
    else {
      console.log("Failed to run Puppeteer:", err);
    }
  });
}

// Data Generation Pipeline
const startDataGen = (config) => {
  // Path to the data generator file
  const dataGenPath = path.join(analyzerPath, "js-build/DataGenerator.js");
  // Path of the output file
  const outputPath = path.join(uiPath, "src/components/data.json");

  // Start preparing data.json
  console.log("\nPreparing data.json...\n")
  const dataGen = spawn("node", [`${dataGenPath}`, `${config.renderTreeFile}`, `${outputPath}`], {
    stdio: "inherit",
    env: {
      ...process.env,
      FILTER: config.filterSuggestions
    }
  });

  dataGen.on("close", code => {
    if(code) {
      console.log("Failed to generate data.json:", code);
    }
    else {
      // Data file successfully created. Start UI
      console.log("\ndata.json ready! Starting Suggestions UI...");
      const runUI = spawn("npm", ["run", "dev", "--", "-p", `${config.uiPort}`],
        {
          cwd: uiPath,
          shell: true
        }
      );

      setTimeout(() => {
        if(config.openUI)
          // Use react utility function to open URL in existing tab (if open)
          openBrowser(`http://localhost:${config.uiPort}/browse`);
        console.log(`\nView suggestions for your webapp here: http://localhost:${config.uiPort}/browse`);
      }, 1000);
    }
  });
}

// Check if the config file exists
fs.exists("analyzerConfig.json", exists => {
  // Parse the default config string
  let config = strToConf(configStr);

  if(exists) {
    // Config file exists
    try {
      // Try parsing the file
      let parsedConfigStr = fs.readFileSync("analyzerConfig.json").toString();
      let parsedConfig = strToConf(parsedConfigStr);
      for(let prop in parsedConfig)
        if(config.hasOwnProperty(prop))
          config[prop] = parsedConfig[prop];
      console.log("Parsed config file successfully!");
    }
    // Failed to parse existing file
    catch(err) {
      console.log("Error parsing config file:", err);
      exit(1);
    }
  }
  // Create a new config file with default options
  else {
    console.log("Config file not found. Creating a default config file");
    fs.writeFileSync("analyzerConfig.json", configStr);
    console.log("Config file created. Make required changes and run `\x1B[1mnpm run analyze\x1B[0m` again");
    exit(0);
  }
  // Run the analyzer pipeline
  runAnalyzer(config);
});
