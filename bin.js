#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const { platform } = require('node:process');
const fs = require('fs');
const path = require('path');

const analyzerPath = path.join(__dirname, "advanced-bundle-analyzer");
const uiPath = path.join(__dirname, "advanced_bundle_analyzer_ui");

function getEnvString(env, value) {
  return (platform === "win32") ? `set ${env}=${value} &&` : `${env}=${value}`;
}

function runAnalyzer() {
  if(fs.existsSync("renderTree.json"))
    fs.unlinkSync("renderTree.json");

  const startApp = spawn('npm', ['start'], {
    env: {
      ...process.env,
      BROWSER: 'none'
    }
  });

  const treePath = getEnvString("TREEPATH", path.resolve());
  exec(`cd "${analyzerPath}" && ${treePath} npm run devtools`, err => {
    if(err)
      console.log("Failed to run React DevTools!");
    else
      console.log("DevTools exited successfully");
  });

  exec(`cd "${analyzerPath}" && ${treePath} npm run puppeteer`, err => {
    if(err)
      console.log("Failed to run Puppeteer!", err);
    else {
      console.log("Headless browser exited successfully");
      startApp.kill("SIGKILL");
      setTimeout(startDataGen, 500);
    }
  });
}

function startDataGen() {
  const dataGenPath = path.join(analyzerPath, "js-build/DataGenerator.js");
  const outputPath = path.join(uiPath, "src/components/data.json");

  console.log(`node "${dataGenPath}" "renderTree.json" "${outputPath}"`);
  exec(`node "${dataGenPath}" "renderTree.json" "${outputPath}"`, err => {
    if(err)
      console.log("Failed to generate data.json");
    else
      setTimeout(() => {const startUI = spawn('npm', ['run', 'dev'], {cwd: uiPath})}, 2000);
  });
}

fs.exists("component-analyzer.json", exists => {
  if(exists)
    runAnalyzer();
  else
    console.log("component-analyzer.json file not found. Exiting!");
});
