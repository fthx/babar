/* 
	BaBar
	by Francois Thirioux
	GitHub contributors: @fthx, @wooque, @frandieguez
	License GPL v3
*/


const { Clutter, Gio, GLib, GObject, Meta, Shell, St } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const AppFavorites = imports.ui.appFavorites;
const AppMenu = Main.panel.statusArea.appMenu;
const WM = global.workspace_manager;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// get Shell version
var is_shell_version_40 = imports.misc.config.PACKAGE_VERSION.split('.')[0] >= 40;

// translation needed to restore Places label, if any
const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = x => x;

// workspaces names from native schema
var WORKSPACES_SCHEMA = "org.gnome.desktop.wm.preferences";
var WORKSPACES_KEY = "workspace-names";

// initial fallback settings
var RIGHT_CLICK = true;
var MIDDLE_CLICK = true;
var REDUCE_PADDING = true;
var APP_GRID_ICON_NAME = 'view-app-grid-symbolic';
var PLACES_ICON_NAME = 'folder-symbolic';
var FAVORITES_ICON_NAME = 'starred-symbolic';
var MOVE_TO_PREVIOUS_WORKSPACE_ICON_NAME = 'go-previous-symbolic';
var MOVE_TO_NEXT_WORKSPACE_ICON_NAME = 'go-next-symbolic';
var FALLBACK_ICON_NAME = 'applications-system-symbolic';
var ICON_SIZE = 20;
var ROUNDED_WORKSPACES_BUTTONS = true;
var TOOLTIP_VERTICAL_PADDING = 10;
var HIDDEN_OPACITY = 127;
var UNFOCUSED_OPACITY = 255;
var FOCUSED_OPACITY = 255;
var DESATURATE_ICONS = false;
var FAVORITES_FIRST = false;
var DISPLAY_ACTIVITIES = false;
var DISPLAY_APP_GRID = true;
var DISPLAY_PLACES_ICON = true;
var DISPLAY_FAVORITES = true;
var DISPLAY_WINDOW_CONTROL = false;
var DISPLAY_WORKSPACES = true;
var DISPLAY_TASKS = true;
var DISPLAY_APP_MENU = false;
var DISPLAY_DASH = true;
var DISPLAY_WORKSPACES_THUMBNAILS = true;


var AppGridButton = GObject.registerClass(
class AppGridButton extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Babar-AppGrid');
		
		this.app_grid_button = new St.BoxLayout({visible: true, reactive: true, can_focus: true, track_hover: true});
		this.app_grid_button.icon = new St.Icon({icon_name: APP_GRID_ICON_NAME, style_class: 'system-status-icon'});
        this.app_grid_button.add_child(this.app_grid_button.icon);
		if (is_shell_version_40) {
			this.app_grid_button.connect('button-press-event', () => Main.overview.showApps());
		} else {
        	this.app_grid_button.connect('button-press-event', () => Main.overview.viewSelector._toggleAppsPage());
		}
        this.add_child(this.app_grid_button);
	}
	
	_destroy() {
		super.destroy();
	}
});

var FavoritesMenu = GObject.registerClass(
class FavoritesMenu extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Babar-Favorites');
		
		// listen to favorites changes
		this.fav_changed = AppFavorites.getAppFavorites().connect('changed', this._display_favorites.bind(this));
		
		// make menu button
    	this.fav_menu_button = new St.BoxLayout({});
		this.fav_menu_icon = new St.Icon({icon_name: FAVORITES_ICON_NAME, style_class: 'system-status-icon'});
        this.fav_menu_button.add_child(this.fav_menu_icon);
		if (!is_shell_version_40) {
			this.fav_menu_button.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
		}
        this.add_child(this.fav_menu_button);

		// display favorites list
		this._display_favorites();
	}
	
	// display favorites menu
	_display_favorites() {
		// destroy old menu items
		if (this.menu) {
			this.menu.removeAll();
		}
		
		// get favorites list
    	this.list_fav = AppFavorites.getAppFavorites().getFavorites();
        
        // create favorites items
    	for (let fav_index = 0; fav_index < this.list_fav.length; ++fav_index) {
    		// get favorite app, name and icon
    		this.fav = this.list_fav[fav_index];
    		this.fav_icon = this.fav.create_icon_texture(ICON_SIZE);
    		this.fav_label = new St.Label({text: this.fav.get_name()});
    		
    		// create menu item
    		this.item = new PopupMenu.PopupBaseMenuItem;
    		this.item_box = new St.BoxLayout({style_class: 'favorite', vertical: false});
    		this.item_box.add_child(this.fav_icon);
    		this.item_box.add_child(this.fav_label);
    		this.item.connect('activate', () => this._activate_fav(fav_index));
    		this.item.add_child(this.item_box);
    		this.menu.addMenuItem(this.item);
    	}
	}
	
	// activate favorite
    _activate_fav(fav_index) {
    	AppFavorites.getAppFavorites().getFavorites()[fav_index].open_new_window(-1);
    }
    
    // remove signals, destroy workspaces bar
	_destroy() {
		if (this.fav_changed) {
			AppFavorites.getAppFavorites().disconnect(this.fav_changed);
		}
		super.destroy();
	}
});

var WindowControlButton = GObject.registerClass(
class WindowControlButton extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Babar-WindowControlButton');
		
		this.window_control_button = new St.BoxLayout({visible: true, reactive: true, can_focus: true, track_hover: true});
		
		this.window_control_button_previous = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
		this.window_control_button_previous_icon = new St.Icon({icon_name: MOVE_TO_PREVIOUS_WORKSPACE_ICON_NAME, style_class: 'system-status-icon'});
        this.window_control_button_previous.set_child(this.window_control_button_previous_icon);
        this.window_control_button_previous.connect('button-press-event', this._move_to_previous_workspace.bind(this));
        
        this.window_control_button_next = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
		this.window_control_button_next_icon = new St.Icon({icon_name: MOVE_TO_NEXT_WORKSPACE_ICON_NAME, style_class: 'system-status-icon'});
        this.window_control_button_next.set_child(this.window_control_button_next_icon);
        this.window_control_button_next.connect('button-press-event', this._move_to_next_workspace.bind(this));
        
        this.window_control_button.add_child(this.window_control_button_previous);
        this.window_control_button.add_child(this.window_control_button_next);
        this.add_child(this.window_control_button);
	}
	
	// move focused window to next workspace (beware of possibly fixed number of ws)
	_move_to_next_workspace() {
		this.ws_count = WM.get_n_workspaces();
        this.active_ws_index = WM.get_active_workspace_index();
        this.focused_window = global.display.get_focus_window();
        if (this.focused_window && this.active_ws_index < this.ws_count - 1) {
        	this.focused_window.change_workspace_by_index(this.active_ws_index + 1, false);
        	this.focused_window.activate(global.get_current_time());
        }
	}
        
    // move focused window to previous workspace
	_move_to_previous_workspace() {
		this.ws_count = WM.get_n_workspaces();
        this.active_ws_index = WM.get_active_workspace_index();
        this.focused_window = global.display.get_focus_window();
        if (this.focused_window && this.active_ws_index > 0) {
        	this.focused_window.change_workspace_by_index(this.active_ws_index - 1, false);
        	this.focused_window.activate(global.get_current_time());
        }
	}
	
	_destroy() {
		super.destroy();
	}
});

var WorkspacesBar = GObject.registerClass(
class WorkspacesBar extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Babar-Tasks');
		
		// tracker for windows
		this.window_tracker = Shell.WindowTracker.get_default();
		
		// define gsettings schema for workspaces names, get workspaces names, signal for settings key changed
		this.workspaces_settings = new Gio.Settings({schema: WORKSPACES_SCHEMA});
		this.workspaces_names_changed = this.workspaces_settings.connect(`changed::${WORKSPACES_KEY}`, this._update_workspaces_names.bind(this));
		
		// define windows that need an icon (see https://www.roojs.org/seed/gir-1.2-gtk-3.0/seed/Meta.WindowType.html)
		this.window_type_whitelist = [Meta.WindowType.NORMAL];
		
		// bar creation
		this.ws_bar = new St.BoxLayout({});
        this._update_workspaces_names();
        this.add_child(this.ws_bar);
        
        // window button tooltip creation
        this.window_tooltip = new St.BoxLayout({style_class: 'window-tooltip'});
		this.window_tooltip.label = new St.Label({y_align: Clutter.ActorAlign.CENTER, text: ""});
		this.window_tooltip.add_child(this.window_tooltip.label);
		this.window_tooltip.hide();
		Main.layoutManager.addChrome(this.window_tooltip);
        
        // signals
		this._ws_number_changed = WM.connect('notify::n-workspaces', this._update_ws.bind(this));
		this._restacked = global.display.connect('restacked', this._update_ws.bind(this));
		this._window_left_monitor = global.display.connect('window-left-monitor', this._update_ws.bind(this));
	}

	// remove signals, restore Activities button, destroy workspaces bar
	_destroy() {
		if (this.workspaces_names_changed) {
			this.workspaces_settings.disconnect(this.workspaces_names_changed);
		}
		if (this._ws_number_changed) {
			WM.disconnect(this._ws_number_changed);
		}
		if (this._restacked) {
			global.display.disconnect(this._restacked);
		}
		if (this._window_left_monitor) {
			global.display.disconnect(this._window_left_monitor);
		}
		if (this.hide_tooltip_timeout) {
			GLib.source_remove(this.hide_tooltip_timeout);
		}
		this.ws_bar.destroy();
		super.destroy();
	}
	
	// update workspaces names
	_update_workspaces_names() {
		this.workspaces_names = this.workspaces_settings.get_strv(WORKSPACES_KEY);
		this._update_ws();
	}

	// update the workspaces bar
    _update_ws() {
    	// destroy old workspaces bar buttons and signals
    	this.ws_bar.destroy_all_children();
    	
    	// get number of workspaces
        this.ws_count = WM.get_n_workspaces();
        this.active_ws_index = WM.get_active_workspace_index();
        		
		// display all current workspaces and tasks buttons
        for (let ws_index = 0; ws_index < this.ws_count; ++ws_index) {
        	// workspace
			var ws_box = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});						
			var ws_box_label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
			
			if (!ROUNDED_WORKSPACES_BUTTONS) {
				if (ws_index == this.active_ws_index) {
					ws_box_label.style_class = 'workspace-active-squared';
				} else {
					ws_box_label.style_class = 'workspace-inactive-squared';
				}
			} else {
				if (ws_index == this.active_ws_index) {
					ws_box_label.style_class = 'workspace-active-rounded';
				} else {
					ws_box_label.style_class = 'workspace-inactive-rounded';
				}
			}
			
			if (this.workspaces_names[ws_index]) {
				ws_box_label.set_text("  " + this.workspaces_names[ws_index] + "  ");
			} else {
				ws_box_label.set_text("  " + (ws_index + 1) + "  ");
			}
			ws_box.set_child(ws_box_label);
			ws_box.connect('button-press-event', () => this._toggle_ws(ws_index));
			if (DISPLAY_WORKSPACES) {
	        	this.ws_bar.add_child(ws_box);
	        }
	        
	        // tasks
	        this.ws_current = WM.get_workspace_by_index(ws_index);
			if (FAVORITES_FIRST) {
				this.favorites_list = AppFavorites.getAppFavorites().getFavorites();
				this.ws_current.windows = this.ws_current.list_windows().sort(this._sort_windows_favorites_first.bind(this));
			} else {
	        	this.ws_current.windows = this.ws_current.list_windows().sort(this._sort_windows);
			}
	        for (let window_index = 0; window_index < this.ws_current.windows.length; ++window_index) {
	        	this.window = this.ws_current.windows[window_index];
	        	if (this.window && this.window_type_whitelist.includes(this.window.get_window_type())) {
	        		this._create_window_button(ws_index, this.window);
	        	}
	        }
		}
    }
    
    // create window button ; ws = workspace, w = window
    _create_window_button(ws_index, w) {    	
    	// move to previous/next workspace buttons (will be shown on w button hover)
    	var move_previous = new St.Bin({visible: false, reactive: true, can_focus: true, track_hover: true});
    	var move_previous_icon = new St.Icon({icon_name: MOVE_TO_PREVIOUS_WORKSPACE_ICON_NAME, style_class: 'system-status-icon'});
    	move_previous.set_child(move_previous_icon);
    	
    	var move_next = new St.Bin({visible: false, reactive: true, can_focus: true, track_hover: true});
    	var move_next_icon = new St.Icon({icon_name: MOVE_TO_NEXT_WORKSPACE_ICON_NAME, style_class: 'system-status-icon'});
    	move_next.set_child(move_next_icon);
    	
    	if (!w.is_on_all_workspaces()) {
			move_previous.connect('button-press-event', () => this._move_to_previous_workspace(ws_index, w));
			move_next.connect('button-press-event', () => this._move_to_next_workspace(ws_index, w));
		}
    	
        // windows on all workspaces have to be displayed only once
    	if (!w.is_on_all_workspaces() || ws_index == 0) {
		    // create button
			var w_box = new St.BoxLayout({visible: true, reactive: true, can_focus: true, track_hover: true, style_class: 'window-box'});
		    var w_box_app = this.window_tracker.get_window_app(w);
		    
		    // arrows state
		    w_box.arrows = false;
		    
		    // create w button and its icon
		    var w_box_button = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
		    var w_box_icon;
		    if (w_box_app) {
		    	w_box_icon = w_box_app.create_icon_texture(ICON_SIZE);
		    }
		    // sometimes no icon is defined or icon is void, at least for a short time
		    if (!w_box_icon || w_box_icon.get_style_class_name() == 'fallback-app-icon') {
		    	w_box_icon = new St.Icon({icon_name: FALLBACK_ICON_NAME, icon_size: ICON_SIZE});
			}
			w_box_button.set_child(w_box_icon);
			w_box_button.connect('button-press-event', (widget, event) => this._on_button_press(widget, event, w_box, ws_index, w));
			w_box.connect('notify::hover', () => this._on_button_hover(w_box, w.title));
			
			// desaturate option
			if (DESATURATE_ICONS) {
				this.desaturate = new Clutter.DesaturateEffect();
				w_box_icon.add_effect(this.desaturate);
			}
		    
			// set icon style and opacity following window state
		    if (w.is_hidden()) {
				w_box_button.style_class = 'window-hidden';
				w_box_icon.set_opacity(HIDDEN_OPACITY);
		    } else {
				if (w.has_focus()) {
				w_box_button.style_class = 'window-focused';
				w_box_icon.set_opacity(FOCUSED_OPACITY);
				} else {
				w_box_button.style_class = 'window-unfocused';
				w_box_icon.set_opacity(UNFOCUSED_OPACITY);
				}
		    }
        
		    // add button in task bar
		    w_box.add_child(w_box_button);
		    w_box.add_child(move_previous);
		   	w_box.add_child(move_next);
		   	if (w.is_on_all_workspaces()) {
		   		this.ws_bar.insert_child_at_index(w_box, 0);	
		   	} else {
		    	this.ws_bar.add_child(w_box);
		    }
		}
	}
	
	// move window w from workspace ws to previous workspace
	_move_to_previous_workspace(ws_index, w) {
		if (ws_index > 0) {
        	w.change_workspace_by_index(ws_index - 1, false);
        	if (w.has_focus()) {
        		w.activate(global.get_current_time());
        	}
        }
        this.window_tooltip.hide();
    }
    
    // move window w from workspace ws to next workspace
	_move_to_next_workspace(ws_index, w) {
		if (ws_index < this.ws_count - 1) {
        	w.change_workspace_by_index(ws_index + 1, false);
        	if (w.has_focus()) {
        		w.activate(global.get_current_time());
        	}
        }
        this.window_tooltip.hide();
    }
	
	// on window w button press
    _on_button_press(widget, event, w_box, ws_index, w) {
    	// left-click: toggle window
    	if (event.get_button() == 1) {
			if (w.has_focus() && !Main.overview.visible) {
				if (w.can_minimize()) {
		   			w.minimize();
		   		}
		   	} else {	
				w.activate(global.get_current_time());
			}
			if (Main.overview.visible) {
				Main.overview.hide();
			}
			if (!w.is_on_all_workspaces()) {
				WM.get_workspace_by_index(ws_index).activate(global.get_current_time());
			}
		}
		
		// right-click: toggle arrows
		if (RIGHT_CLICK && event.get_button() == 3 && !w.is_on_all_workspaces()) {
			if (!w_box.arrows) {
				if (w_box.get_child_at_index(1)) {
					w_box.get_child_at_index(1).show();
				}
				if (w_box.get_child_at_index(2)) {
					w_box.get_child_at_index(2).show();
				}
				w_box.arrows = true;
			} else {
				if (w_box.get_child_at_index(1)) {
					w_box.get_child_at_index(1).hide();
				}
				if (w_box.get_child_at_index(2)) {
					w_box.get_child_at_index(2).hide();
				}
				w_box.arrows = false;
			}
		}
		
		// middle-click: close window
		if (MIDDLE_CLICK && event.get_button() == 2 && w.can_close()) {
			w.delete(global.get_current_time());
			this.window_tooltip.hide();
		}
		
    }
    
    // sort windows by creation date
    _sort_windows(w1, w2) {
    	return w1.get_id() - w2.get_id();
    }
    
    // sort windows by favorite order first then by creation date
    _sort_windows_favorites_first(w1, w2) {
		this.w1_app = this.window_tracker.get_window_app(w1);
		this.w2_app = this.window_tracker.get_window_app(w2);
		if (!this.w1_app || !this.w2_app) {
			return 0;
		}
		this.w1_is_favorite = AppFavorites.getAppFavorites().isFavorite(this.w1_app.get_id());
		this.w2_is_favorite = AppFavorites.getAppFavorites().isFavorite(this.w2_app.get_id());

		if (!this.w1_is_favorite && !this.w2_is_favorite) {
			return this._sort_windows(w1, w2);
		}
		if (this.w1_is_favorite && this.w2_is_favorite) {
			if (this.w1_app == this.w2_app) {
				return this._sort_windows(w1, w2);
			} else {
				return this.favorites_list.indexOf(this.w1_app) - this.favorites_list.indexOf(this.w2_app);
			}
		}
		if (this.w1_is_favorite && !this.w2_is_favorite) {
			return -1;
		}
		if (!this.w1_is_favorite && this.w2_is_favorite) {
			return 1;
		}
	}

    // toggle or show overview
    _toggle_ws(ws_index) {
		if (ws_index == WM.get_active_workspace_index()) {
			Main.overview.toggle();
		} else {
			WM.get_workspace_by_index(ws_index).activate(global.get_current_time());
			Main.overview.show();
		}
    }
    
    // on w button hover: toggle tooltip
    _on_button_hover(w_box, window_title) {
		if (window_title && w_box && w_box.get_hover()) {
			this.window_tooltip.set_position(w_box.get_transformed_position()[0], Main.layoutManager.primaryMonitor.y + Main.panel.height + TOOLTIP_VERTICAL_PADDING);
			this.window_tooltip.label.set_text(window_title);
			this.window_tooltip.show();
			this.hide_tooltip_timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
				if (!Main.panel.statusArea['babar-workspaces-bar'].get_hover()) {
					this.window_tooltip.hide()
				}
			});
		} else {
			this.window_tooltip.hide();
		}
    }
});

class Extension {
	constructor() {
	}
	
	// get settings
    _get_settings() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.babar');
        
        this.settings_already_changed = false;
		this.settings_changed = this.settings.connect('changed', this._settings_changed.bind(this));
		
		RIGHT_CLICK = this.settings.get_boolean('right-click');
		MIDDLE_CLICK = this.settings.get_boolean('middle-click');
		REDUCE_PADDING = this.settings.get_boolean('reduce-padding');
		APP_GRID_ICON_NAME = this.settings.get_string('app-grid-icon-name');
		PLACES_ICON_NAME = this.settings.get_string('places-icon-name');
		FAVORITES_ICON_NAME = this.settings.get_string('favorites-icon-name');
		FALLBACK_ICON_NAME = this.settings.get_string('fallback-icon-name');
		ICON_SIZE = this.settings.get_int('icon-size');
		ROUNDED_WORKSPACES_BUTTONS = this.settings.get_boolean('rounded-workspaces-buttons');
		TOOLTIP_VERTICAL_PADDING = this.settings.get_int('tooltip-vertical-padding');
		HIDDEN_OPACITY = this.settings.get_int('hidden-opacity');
		UNFOCUSED_OPACITY = this.settings.get_int('unfocused-opacity');
		FOCUSED_OPACITY = this.settings.get_int('focused-opacity');
		DESATURATE_ICONS = this.settings.get_boolean('desaturate-icons');
		FAVORITES_FIRST = this.settings.get_boolean('favorites-first');
		DISPLAY_ACTIVITIES = this.settings.get_boolean('display-activities');
		DISPLAY_APP_GRID = this.settings.get_boolean('display-app-grid');
		DISPLAY_PLACES_ICON = this.settings.get_boolean('display-places-icon');
		DISPLAY_FAVORITES = this.settings.get_boolean('display-favorites');
		DISPLAY_WINDOW_CONTROL = this.settings.get_boolean('display-window-control');
		DISPLAY_WORKSPACES = this.settings.get_boolean('display-workspaces');
		DISPLAY_TASKS = this.settings.get_boolean('display-tasks');
		DISPLAY_APP_MENU = this.settings.get_boolean('display-app-menu');
		DISPLAY_DASH = this.settings.get_boolean('display-dash');
		DISPLAY_WORKSPACES_THUMBNAILS = this.settings.get_boolean('display-workspaces-thumbnails');
    }
    
    // restart extension after settings changed
    _settings_changed() {
    	if (!this.settings_already_changed) {
    		Main.notify("Please restart BaBar extension to apply changes.");
    		this.settings_already_changed = true;
    	}
    }    
    
    // toggle Activities button
	_show_activities(show) {
		this.activities_button = Main.panel.statusArea['activities'];
		if (this.activities_button) {
			if (show && !Main.sessionMode.isLocked) {
				this.activities_button.container.show();
			} else {
				this.activities_button.container.hide();
			}
		}
	}
	
	// toggle Places Status Indicator extension label to folder	
	_show_places_icon(show_icon) {
		this.places_indicator = Main.panel.statusArea['places-menu'];
		if (this.places_indicator && is_shell_version_40) {
			this.places_indicator.remove_child(this.places_indicator.get_first_child());
			if (show_icon) {
				this.places_icon = new St.Icon({icon_name: PLACES_ICON_NAME, style_class: 'system-status-icon'});
				this.places_indicator.add_child(this.places_icon);
			} else {
				this.places_label = new St.Label({text: _('Places'), y_expand: true, y_align: Clutter.ActorAlign.CENTER});
				this.places_indicator.add_child(this.places_label);
			}
		}
		if (this.places_indicator && !is_shell_version_40) {
			this.places_box = this.places_indicator.get_first_child();
			this.places_box.remove_child(this.places_box.get_first_child());
			if (show_icon) {
				this.places_icon = new St.Icon({icon_name: PLACES_ICON_NAME, style_class: 'system-status-icon'});
				this.places_box.insert_child_at_index(this.places_icon, 0);
			} else {
				this.places_label = new St.Label({text: _('Places'), y_expand: true, y_align: Clutter.ActorAlign.CENTER});
				this.places_box.insert_child_at_index(this.places_label, 0);
			}
		}
	}
	
	// toggle dash in overview
	_show_dash(show) {
		if (show) {
			Main.overview.dash.show();
		} else {
			Main.overview.dash.hide();
		}
	}
	
	// toggle workspaces thumbnails in overview
	_hide_workspaces_thumbnails() {
		Main.overview._overview._controls._thumbnailsBox.hide();
	}

    enable() {    
    	// get settings
    	this._get_settings();
    	
    	// top panel left box padding
    	if (REDUCE_PADDING) {
    		Main.panel._leftBox.add_style_class_name('leftbox-reduced-padding');
    	}
    
    	// Activities button
    	if (!DISPLAY_ACTIVITIES) {
    		this._show_activities(false);
    	}
    	
    	// app grid
		if (DISPLAY_APP_GRID) {
			this.app_grid = new AppGridButton();
			Main.panel.addToStatusArea('babar-app-grid-button', this.app_grid, 0, 'left');
		}
		
		// Places label to icon
		if (DISPLAY_PLACES_ICON) {
			this._show_places_icon(true);
			this.extensions_changed = Main.extensionManager.connect('extension-state-changed', () => this._show_places_icon(true));
		}
		
		// favorites
		if (DISPLAY_FAVORITES) {
			this.favorites_menu = new FavoritesMenu();
			Main.panel.addToStatusArea('babar-favorites-menu', this.favorites_menu, 3, 'left');
		}
		
		// window control
		if (DISPLAY_WINDOW_CONTROL) {
			this.window_control = new WindowControlButton();
			Main.panel.addToStatusArea('babar-window-control', this.window_control, 4, 'left');
		}
		
		// tasks
		if (DISPLAY_TASKS) {
			this.workspaces_bar = new WorkspacesBar();
			Main.panel.addToStatusArea('babar-workspaces-bar', this.workspaces_bar, 5, 'left');
		}
		
		// AppMenu
    	if (!DISPLAY_APP_MENU) {
			AppMenu.container.hide();
		}
		
		// dash
		if (!DISPLAY_DASH) {
			this._show_dash(false);
		}
		
		// workspaces thumbnails
		if (!DISPLAY_WORKSPACES_THUMBNAILS) {
			this.showing_overview = Main.overview.connect('showing', this._hide_workspaces_thumbnails.bind(this));
		}
    }

    disable() {
		// app grid
    	if (DISPLAY_APP_GRID && this.app_grid) {
    		this.app_grid._destroy();
    	}
    	
    	// favorites
    	if (DISPLAY_FAVORITES && this.favorites_menu) {
    		this.favorites_menu._destroy();
    	}
    	
    	// window control
    	if (DISPLAY_WINDOW_CONTROL && this.window_control) {
			this.window_control._destroy();
		}
    	
    	// workspaces bar
    	if (DISPLAY_TASKS && this.workspaces_bar) {
    		this.workspaces_bar._destroy();
    	}
    	
    	// top panel left box padding
    	if (REDUCE_PADDING) {
    		Main.panel._leftBox.remove_style_class_name('leftbox-reduced-padding');
    	}
    	
    	// Places label and unwatch extensions changes
    	if (DISPLAY_PLACES_ICON && this.places_indicator) {
    		this._show_places_icon(false);
    		Main.extensionManager.disconnect(this.extensions_changed);
    	}
    	
    	// Activities button
    	this._show_activities(true);
    	
    	// AppMenu icon
    	if (!Main.overview.visible && !Main.sessionMode.isLocked) {
			AppMenu.container.show();
		}
		
		// dash
		this._show_dash(true);
		
		// workspaces thumbnails
		if (!DISPLAY_WORKSPACES_THUMBNAILS && this.showing_overview) {
			Main.overview.disconnect(this.showing_overview);
		}
		
		// unwatch settings
		this.settings.disconnect(this.settings_changed);
    }
}

function init() {
	return new Extension();
}

