PREFIX ?= ~/.local/share/gnome-shell/extensions

TRANSLATION_ID=babar
EXTENSION_UUID=babar@fthx
GLIB_COMPILE_SCHEMAS = /usr/bin/glib-compile-schemas
EXTENSION_INSTALL_DIR = $(PREFIX)/$(EXTENSION_UUID)

all: build install

.PHONY: build
build:
	echo "Building extension"
	@$(GLIB_COMPILE_SCHEMAS) ./schemas
	mkdir -p build/$(EXTENSION_UUID)
	cp -r schemas ui *.js metadata.json README.md *.css build/$(EXTENSION_UUID)

install: build
	echo "Installing extension files in $(EXTENSION_INSTALL_DIR)"
	@mkdir -p $(EXTENSION_INSTALL_DIR)
	@cp -r build/$(EXTENSION_UUID)/* $(EXTENSION_INSTALL_DIR)

zip: build
	echo "Creating zip file from extension"
	@zip -r $(EXTENSION_UUID).zip ./build/$(EXTENSION_UUID)/*