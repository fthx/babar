NAME :=  $(shell jq '.uuid' -r metadata.json)
BUNDLE = $(NAME).shell-extension.zip

default:

pack:
	gnome-extensions pack -f .

install: pack
	gnome-extensions install -f $(BUNDLE)

uninstall:
	gnome-extensions uninstall $(NAME)

enable:
	gnome-extensions enable $(NAME)

disable:
	gnome-extensions disable $(NAME)
