#!/usr/bin/env node

const { exec } = require('child_process');
const { platform, exit } = require('node:process');
const fs = require('fs');
const path = require('path');

const analyzerPath = path.join(__dirname, "advanced-bundle-analyzer");
const uiPath = path.join(__dirname, "advanced_bundle_analyzer_ui");

const configStr =
`{
  /* General */
  "appStart": "npm start",                      /* Command to start webapp */
  "devToolsHeadless": true,                     /* Run DevTools in Headless mode */
  "browserHeadless": true,                      /* Run Browser in Headless mode */
  "devToolsDebug": false,                       /* Debug Log in DevTools */

  /* Render Tree */
  "renderTreeFile": "renderTree.json",          /* Name of the file containing information about render tree */
  "refreshConnection": 50,                      /* Time (in ms) before retrying to connect to DevTools or webapp */
  "checkFile": 1000,                            /* Time interval (in ms) to check if render tree has been extracted and saved */
  "renderTreeWait": 1000,                       /* Time (in ms) after which DevTools is initialized and render tree must be extracted */
  "updateFilters": 1000,                        /* Time (in ms) to wait for DevTools to filter out unnecessary components */

  /* Data Generation and Suggestions UI */
  "analyzeRoute": "http://localhost:3000",      /* Route that is to be analyzed */
  "dataGenWait": 500,                           /* Time (in ms) after which render tree is extracted and data.json must be prepared */
  "uiPort": 4242,                               /* Port number on which suggestions UI will be run */
  "openUI": true                                /* Opens Suggestion UI in browser */
}`

const removeComments = (str) => str.replace(/([^:]\/\/.*|\/\*((.|\r\n|\s)*?)\*\/)/gm, "");

const strToConf = (str) => JSON.parse(removeComments(str));

const runAnalyzer = (config) => {
  if(fs.existsSync(config.renderTreeFile))
    fs.unlinkSync(config.renderTreeFile);

  console.log("Starting webapp...\n");
  console.log(config.appStart)
  exec(config.appStart,
    {
      env: {
        ...process.env,
        BROWSER: 'none'
      },
      shell: true
    }
  );

  console.log("Starting DevTools in Headless Mode...");
  exec("npm run devtools",
    {
      cwd: analyzerPath,
      env: {
        ...process.env,
        RENDER_TREE_PATH: path.resolve(),
        RENDER_TREE_FILE: config.renderTreeFile,
        RENDER_TREE_WAIT: config.renderTreeWait,
        DEVTOOLS_HEADLESS: config.devToolsHeadless,
        DEVTOOLS_DEBUG: config.devToolsDebug,
        UPDATE_FILTERS: config.updateFilters
      },
      shell: true
    },
    err => {
      if(err) {
        console.log("Failed to run React DevTools:", err);
        exit(1);
      }
      else
        console.log("DevTools exited successfully!");
    }
  );

  console.log("Starting Puppeteer in Headless Mode...");
  exec("npm run puppeteer",
    {
      cwd: analyzerPath,
      env: {
        ...process.env,
        RENDER_TREE_PATH: path.resolve(),
        RENDER_TREE_FILE: config.renderTreeFile,
        ANALYZE_ROUTE: config.analyzeRoute,
        REFRESH_CONN: config.refreshConnection,
        BROWSER_HEADLESS: config.browserHeadless
      },
      shell: true
    },
    err => {
      if(err) {
        console.log("Failed to run Puppeteer:", err);
        exit(1);
      }
      else {
        console.log("Puppeteer exited successfully!");
        setTimeout(() => startDataGen(config), config.dataGenWait);
      }
    }
  );
}

const startDataGen = (config) => {
  const dataGenPath = path.join(analyzerPath, "js-build/DataGenerator.js");
  const outputPath = path.join(uiPath, "src/components/data.json");

  console.log("\nPreparing data.json...")
  exec(`node "${dataGenPath}" "${config.renderTreeFile}" "${outputPath}"`, err => {
    if(err) {
      console.log("Failed to generate data.json:", err);
      exit(1);
    }
    else {
      console.log("data.json ready! Starting Suggestions UI...");
      exec(`npm run dev -- -p ${config.uiPort}`,
        {
          cwd: uiPath,
          shell: true
        }
      );

      setTimeout(() => {
        if(config.openUI) {
          const startCmd = (platform == 'darwin'? 'open': platform == 'win32'? 'start': 'xdg-open');
          exec(`${startCmd} http://localhost:${config.uiPort}/browse`);
        }
        console.log(`\nView suggestions for your webapp here: http://localhost:${config.uiPort}/browse`);
      }, 1000);
    }
  });
}

fs.exists("analyzerConfig.json", exists => {
  let config = strToConf(configStr);

  if(exists) {
    try {
      let parsedConfigStr = fs.readFileSync("analyzerConfig.json").toString();
      let parsedConfig = strToConf(parsedConfigStr);
      for(let prop in parsedConfig)
        if(config.hasOwnProperty(prop))
          config[prop] = parsedConfig[prop];
      console.log("Parsed config file successfully!");
    }
    catch(err) {
      console.log("Error parsing config file:", err);
      exit(1);
    }
  }
  else {
    console.log("Config file not found. Creating a default config file");
    fs.writeFileSync("analyzerConfig.json", configStr);
    console.log("Config file created. Make required changes and run `\x1B[1mnpm run analyze\x1B[0m` again");
    exit(0);
  }
  runAnalyzer(config);
});
