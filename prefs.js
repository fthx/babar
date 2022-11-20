// Preferences UI for BaBar GNOME Shell extension

const { Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const is_shell_version_40 = imports.misc.config.PACKAGE_VERSION.split('.')[0] >= 40;


function init() {
}

function make_item(label, schema, type, min, max) {
    this.item_label = new Gtk.Label({
        label: label,
        margin_start: 14,
        halign: Gtk.Align.START,
        visible: true
    });
    let grid = new Gtk.Grid({
    	visible: true,
    	margin_start: 18,
        margin_end: 18,
    	margin_top: 2,
    	margin_bottom: 2,
    	column_spacing: 96
    });
    grid.attach(this.item_label, 0, 0, 1, 1);

	if (type == 'b') {
		this.item_value = new Gtk.Switch({
		    active: this.settings.get_boolean(schema),
		    halign: Gtk.Align.END,
		    hexpand: true,
		    visible: true
		});
		
		grid.attach(this.item_value, 1, 0, 1, 1);

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
		    hexpand: true,
		    visible: true
		});
		
		grid.attach(this.item_value, 1, 0, 1, 1);

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
		    hexpand: true,
		    visible: true
		});
		
		grid.attach(this.item_value, 1, 0, 1, 1);

		this.settings.bind(
		    schema,
		    this.item_value,
		    'text',
		    Gio.SettingsBindFlags.DEFAULT
		);
	}
    this.list[is_shell_version_40 ? 'append' : 'add'](grid);
}

function make_section_title(title) {
	this.section_title = new Gtk.Label({
        label: '<b>' + title + '</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        margin_start: 8,
        margin_top: 2,
    	margin_bottom: 2,
        visible: true,
    });
    this.list[is_shell_version_40 ? 'append' : 'add'](this.section_title);
    
}

function buildPrefsWidget() {
	this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.babar');

	this.prefsWidget = new Gtk.ScrolledWindow({
		visible: true,
		margin_start: 18,
        margin_end: 18,
        margin_top: 18,
        margin_bottom: 18,
        vexpand: true,
		hscrollbar_policy: Gtk.PolicyType.NEVER,
		vscrollbar_policy: Gtk.PolicyType.AUTOMATIC
	});
    this.list = new Gtk.ListBox({
        selection_mode: null,
        can_focus: false,
        visible: true
    });
    this.prefsWidget[is_shell_version_40 ? 'set_child' : 'add'](this.list);

	// items
    make_section_title('Elements (default value)');

	make_item('Activities (false)', 'display-activities', 'b');
    make_item('Applications grid (true)', 'display-app-grid', 'b');
    make_item('Favorites menu (true)', 'display-favorites', 'b');
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
    make_item('Move panel to the bottom of the screen (false)', 'bottom-panel', 'b');
    make_item('Task icon size (18: Shell <= 3.38, 20: Shell >= 40)', 'icon-size', 'i', 8, 64);
	make_item('Thumbnail maximum size % (25)', 'thumbnail-max-size', 'i', 10, 100);
    make_item('Applications grid icon (view-app-grid-symbolic)', 'app-grid-icon-name', 's');
    make_item('Places icon (folder-symbolic)', 'places-icon-name', 's');
    make_item('Favorites icon (starred-symbolic)', 'favorites-icon-name', 's');
    
    make_section_title('Behavior (default value)');
    
	make_item('Workspaces: left click to show, right-click to show or toggle overview (false)', 'workspaces-right-click', 'b');
    make_item('Tasks: right-click to show window thumbnail (true)', 'right-click', 'b');
    make_item('Tasks: middle-click to close window (true)', 'middle-click', 'b');
	make_item('Tasks: sort favorites first (false)', 'favorites-first', 'b');
	
    // return widget
    return this.prefsWidget;
}
