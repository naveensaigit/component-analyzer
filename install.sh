# Install packages
if [[ "$OSTYPE" == "msys"* ]]; then
  npm i -g yarn typescript
else
  sudo npm i -g yarn typescript
fi

# Install dependencies for pipeline
yarn

# Setup React DevTools
cd react
yarn
yarn build-for-devtools
cd packages/react-devtools-core
yarn build

# Setup bundle analyzer
cd ../../../advanced-bundle-analyzer
yarn
tsc

# Setup bundle analyzer UI
cd ../suggestions_ui
yarn

cd ..