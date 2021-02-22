@echo off
set VER=1.1.5

sed -i -b -E "s/version>.+?</version>%VER%</" xul\install.rdf
sed -i -E "s/version>.+?</version>%VER%</; s/download\/.+?\/esrc-explorer-.+?\.xpi/download\/%VER%\/esrc-explorer-%VER%\.xpi/" update.xml

call node make.js xul

set XPI=esrc-explorer-%VER%.xpi
if exist %XPI% del %XPI%
copy dist\%XPI% .
