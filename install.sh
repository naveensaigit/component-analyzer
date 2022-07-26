# Install packages
sudo npm i -g yarn typescript

# Setup React DevTools
cd react
yarn
yarn build-for-devtools
cd packages/react-devtools-core
yarn build

# Register modified DevTools in yarn link
cd ../react-devtools
yarn link

# Setup bundle analyzer
cd ../../../advanced-bundle-analyzer
yarn
tsc
# Link the local react-devtools
yarn link "react-devtools"

# Setup bundle analyzer UI
cd ../advanced_bundle_analyzer_ui
yarn

# Register component-analyzer in yarn link
cd ..
yarn link