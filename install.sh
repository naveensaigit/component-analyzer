# Install packages
sudo npm i -g yarn typescript

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
# Link the local react-devtools
if [[ "$OSTYPE" == "msys"* ]]; then
  npm link ../react/packages/react-devtools
else
  sudo npm link ../react/packages/react-devtools
fi

# Setup bundle analyzer UI
cd ../advanced_bundle_analyzer_ui
yarn

cd ..