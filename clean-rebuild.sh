#!/usr/bin/env bash
set -e

echo "==> Killing Xcode and xcodebuild if running"
killall Xcode 2>/dev/null || true
killall xcodebuild 2>/dev/null || true

echo "==> Removing build artifacts and Pods"
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/"Hompra-*

echo "==> Checking DerivedData is clean"
if ls "$HOME/Library/Developer/Xcode/DerivedData/" 2>/dev/null | grep -i hompra; then
  echo "WARNING: leftover Hompra DerivedData still present"
else
  echo "DerivedData clean."
fi

echo "==> Running pod install"
cd ios
pod install
cd ..

echo "==> Building with expo"
npx expo run:ios
