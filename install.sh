# Install packages
if [[ "$OSTYPE" == "msys"* ]]; then
  npm i -g yarn typescript
else
  sudo npm i -g yarn typescript
fi

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
cd ../suggestions_ui
yarn

cd ..