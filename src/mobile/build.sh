#!/bin/bash

echo "Building CashOutAI Mobile..."

# Install dependencies
yarn install

# Build for production
yarn build

echo "Mobile app built successfully!"
echo "Build files are in the 'build' directory"
echo "Ready for deployment to Render!"