## Component Analyzer

A tool that gives suggestions about which React components can be lazy loaded.

## Usage

Clone the repo (along with submodules)
```sh
git clone https://github.com/naveensaigit/component-analyzer --recurse-submodules
```

Install the dependencies for all the submodules
```sh
chmod +x install.sh
./install.sh
```

Install `component-analyzer` as a dependency in your React repo
```sh
cd /path/to/repo
npm link /path/to/component-analyzer
```