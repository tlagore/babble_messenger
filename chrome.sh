#!/bin/bash

rm -rf ~/Desktop/testprofile/
google-chrome --unsafely-treat-insecure-origin-as-secure="$1" --user-data-dir=~/Desktop/testprofile
