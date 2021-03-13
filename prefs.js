// Preferences UI for BaBar GNOME Shell extension

const { Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function make_item(label, schema, type, min, max) {
    this.item_label = new Gtk.Label({
        label: label,
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(this.item_label, 0, row, 1, 1);

	if (type == 'b') {
		this.item_value = new Gtk.Switch({
		    active: this.settings.get_boolean(schema),
		    halign: Gtk.Align.END,
		    visible: true
		});
		
		prefsWidget.attach(this.item_value, 1, this.row, 1, 1);

    	this.settings.bind(
		    schema,
		    this.item_value,
		    'active',
		    Gio.SettingsBindFlags.DEFAULT
    	);
	}
	
	if (type == 'i') {
		this.item_adjustment = new Gtk.Adjustment({
			lower: min,
			upper: max,
			step_increment: 1
		});
		this.item_value = new Gtk.SpinButton({
			adjustment: this.item_adjustment,
			value: this.settings.get_int(schema),
		    halign: Gtk.Align.END,
		    visible: true
		});
		
		prefsWidget.attach(this.item_value, 1, this.row, 1, 1);

		this.settings.bind(
		    schema,
		    this.item_value,
		    'value',
		    Gio.SettingsBindFlags.DEFAULT
		);
	}
	
	if (type == 's') {
		this.item_value = new Gtk.Entry({
			text: this.settings.get_string(schema),
		    halign: Gtk.Align.END,
		    visible: true
		});
		
		prefsWidget.attach(this.item_value, 1, this.row, 1, 1);

		this.settings.bind(
		    schema,
		    this.item_value,
		    'text',
		    Gio.SettingsBindFlags.DEFAULT
		);
	}
        
    this.row += 1;
}

function make_section_title(title) {
	this.section_title = new Gtk.Label({
        label: '<b>' + title + '</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(this.section_title, 0, this.row, 2, 1);
    
    this.row += 1;
}

function buildPrefsWidget() {
	this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.babar');
        
    this.prefsWidget = new Gtk.Grid({
		'margin-start': 18,
        'margin-end': 18,
        'margin-top': 18,
        'margin-bottom': 18,
        'column-spacing': 96,
        'row-spacing': 8,
        visible: true
    });
    this.row = 0;

	// items
    make_section_title('Elements (default value)');

	make_item('Activities (false)', 'display-activities', 'b');
    make_item('Applications grid (true)', 'display-app-grid', 'b');
    make_item('Favorites menu (true)', 'display-favorites', 'b');
    make_item('Move focused window to previous/next workspace (false)', 'display-window-control', 'b');
    make_item('Workspaces (true)', 'display-workspaces', 'b');
    make_item('Tasks (true)', 'display-tasks', 'b');
    make_item('Application menu (false)', 'display-app-menu', 'b');
    make_item('Dash in overview (true)', 'display-dash', 'b');
    make_item('Workspaces thumbnails in overview (true)', 'display-workspaces-thumbnails', 'b');
    
    make_section_title('Appearance (default value)');
    
    make_item('Reduce elements padding (true)', 'reduce-padding', 'b');
    make_item('Places extension label to icon (true)', 'display-places-icon', 'b');
    make_item('Rounded workspaces icons (false)', 'rounded-workspaces-buttons', 'b');
    make_item('Remove color from tasks icons (false)', 'desaturate-icons', 'b');
    make_item('Tasks icons size (20)', 'icon-size', 'i', 8, 48);
    make_item('Applications grid icon (view-app-grid-symbolic)', 'app-grid-icon-name', 's');
    make_item('Places icon (folder-symbolic)', 'places-icon-name', 's');
    make_item('Favorites icon (starred-symbolic)', 'favorites-icon-name', 's');
    
    make_section_title('Behaviour (default value)');
    
    make_item('Right-click to show move-to-workspace arrows (true)', 'right-click', 'b');
    make_item('Middle-click to close window (true)', 'middle-click', 'b');
	make_item('Sort favorites first (false)', 'favorites-first', 'b');
	
    // return widget
    return this.prefsWidget;
}
