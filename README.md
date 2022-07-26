## Component Analyzer

A tool that gives suggestions about which React components can be lazy loaded.

## Usage

Clone the repo (along with submodules)
```sh
git clone https://github.com/naveensaigit/component-analyzer --recurse-submodules
```

Install the dependencies for all the submodules
```sh
cd component-analyzer
chmod +x install.sh
./install.sh
```

Install `component-analyzer` as a dependency in your React repo
```sh
cd /path/to/repo
yarn link "component-analyzer"
```

Add the following command to your `package.json` in the `scripts` section
```sh
"analyze": "component-analyzer"
```

Add the following line of code to your `index.html` file in the beginning of the `head` section.
```sh
<script src="http://localhost:8097"></script>
```

Execute `npm run analyze` to get the renderTree file.
