/* 
	BaBar
	Copyright Francois Thirioux 2021
	GitHub contributors: @fthx
	License GPL v3
*/


const { Clutter, Gio, GObject, Meta, Shell, St } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const AppFavorites = imports.ui.appFavorites;
const AppMenu = Main.panel.statusArea.appMenu;
const WM = global.workspace_manager;


var WORKSPACES_SCHEMA = "org.gnome.desktop.wm.preferences";
var WORKSPACES_KEY = "workspace-names";
var FAVORITES_ICON_NAME = 'starred-symbolic';
var DISPLAY_APP_GRID = true;
var ICON_SIZE = 20;
var HIDDEN_OPACITY = 127;
var UNFOCUSED_OPACITY = 255;
var FOCUSED_OPACITY = 255;
var HIDE_APP_MENU = true;
var DISPLAY_FAVORITES = true;
var DISPLAY_TASKS = true;


var AppGridButton = GObject.registerClass(
class AppGridButton extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Babar-AppGrid');
		
		this.app_grid_button = new St.BoxLayout({visible: true, reactive: true, can_focus: true, track_hover: true});
		this.app_grid_button.icon = new St.Icon({ icon_name: 'view-app-grid-symbolic', style_class: 'system-status-icon' });
        this.app_grid_button.add_child(this.app_grid_button.icon);
        this.app_grid_button.connect('button-press-event', () => Main.overview.viewSelector._toggleAppsPage());
        this.add_child(this.app_grid_button);
	}
});


var FavoritesMenu = GObject.registerClass(
class FavoritesMenu extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Babar-Favorites');
		
		// listen to favorites changes
		this.fav_changed = AppFavorites.getAppFavorites().connect('changed', this._display_favorites.bind(this));
		
		// make menu button
    	this.button = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
		this.icon = new St.Icon({ icon_name: FAVORITES_ICON_NAME, style_class: 'system-status-icon' });
        this.button.add_child(this.icon);
        this.button.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
        this.add_child(this.button);

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
    		this.fav.icon = this.fav.create_icon_texture(ICON_SIZE);
    		this.fav.label = new St.Label({text: this.fav.get_name()});
    		
    		// create menu item
    		this.item = new PopupMenu.PopupBaseMenuItem;
    		this.item.box = new St.BoxLayout({style_class: 'favorite', vertical: false});
    		this.item.box.add_child(this.fav.icon);
    		this.item.box.add_child(this.fav.label);
    		this.item.connect('activate', () => this._activate_fav(fav_index));
    		this.item.add_child(this.item.box);
    		this.menu.addMenuItem(this.item);
    	}
	}
	
	// activate favorite
    _activate_fav(fav_index) {
    	AppFavorites.getAppFavorites().getFavorites()[fav_index].open_new_window(-1);
    }
    
    // remove signals, destroy workspaces bar
	_destroy() {
		AppFavorites.getAppFavorites().disconnect(this.fav_changed);
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
		this.workspaces_settings = new Gio.Settings({ schema: WORKSPACES_SCHEMA });
		this.workspaces_names_changed = this.workspaces_settings.connect(`changed::${WORKSPACES_KEY}`, this._update_workspaces_names.bind(this));
	
		// bar creation
		this.ws_bar = new St.BoxLayout({});
        this._update_workspaces_names();
        this.add_child(this.ws_bar);
        
        // signals
		this._ws_number_changed = WM.connect('notify::n-workspaces', this._update_ws.bind(this));
		this._restacked = global.display.connect('restacked', this._update_ws.bind(this));
		this._window_left_monitor = global.display.connect('window-left-monitor', this._update_ws.bind(this));
	}

	// remove signals, restore Activities button, destroy workspaces bar
	_destroy() {
		this.workspaces_settings.disconnect(this.workspaces_names_changed);
		WM.disconnect(this._ws_number_changed);
		global.display.disconnect(this._restacked);
		global.display.disconnect(this._window_left_monitor);
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
			this.ws_box = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});						
			this.ws_box.label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
			if (ws_index == this.active_ws_index) {
				this.ws_box.label.style_class = 'workspace-active';
			} else {
				this.ws_box.label.style_class = 'workspace-inactive';
			}
			if (ws_index == 0) {
				this.ws_box.label.set_style('margin-left: 0px');
			}
			if (this.workspaces_names[ws_index]) {
				this.ws_box.label.set_text("  " + this.workspaces_names[ws_index] + "  ");
			} else {
				this.ws_box.label.set_text("  " + (ws_index + 1) + "  ");
			}
			this.ws_box.set_child(this.ws_box.label);
			this.ws_box.connect('button-press-event', () => this._toggle_ws(ws_index));
	        this.ws_bar.add_child(this.ws_box);
	        
	        // tasks
	        this.ws_current = WM.get_workspace_by_index(ws_index);
	        this.ws_current.windows = this.ws_current.list_windows().sort(this._sort_windows);
	        for (let window_index = 0; window_index < this.ws_current.windows.length; ++window_index) {
	        	this.window = this.ws_current.windows[window_index];
	        	if (this.window) {
	        		this._create_window_button(ws_index, this.window);
	        	}
	        }
		}
    }
    
    // create window button
    _create_window_button(ws_index, window) {
      if ([
        Meta.WindowType.DROPDOWN_MENU,
        Meta.WindowType.MODAL_DIALOG,
      ].includes(window.window_type)) {
        return;
      }
    	if (!window.is_on_all_workspaces() || ws_index == 0) {
		    // create button
			this.w_box = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});
			this.w_box.connect('button-press-event', () => this._toggle_window(ws_index, window));
		    this.w_box.app = this.window_tracker.get_window_app(window);
		    if (this.w_box.app) {
		    	this.w_box.icon = this.w_box.app.create_icon_texture(ICON_SIZE);
		    }
		    
			// set icon style and opacity following window state
		    if (window.is_hidden()) {
				this.w_box.style_class = 'window-hidden';
				this.w_box.icon.set_opacity(HIDDEN_OPACITY);
		    } else {
				if (window.has_focus()) {
				this.w_box.style_class = 'window-focused';
				this.w_box.icon.set_opacity(FOCUSED_OPACITY);
				} else {
				this.w_box.style_class = 'window-unfocused';
				this.w_box.icon.set_opacity(UNFOCUSED_OPACITY);
				}
		    }
        
		    // add button in task bar
		   	this.w_box.set_child(this.w_box.icon);
		   	if (window.is_on_all_workspaces()) {
		   		this.ws_bar.insert_child_at_index(this.w_box, 0);	
		   	} else {
		    	this.ws_bar.add_child(this.w_box);
		    }
		}
	}
	
	// switch to workspace and toggle window
    _toggle_window(ws_index, window) {
	    if (WM.get_active_workspace_index() == ws_index && window.has_focus() && !(Main.overview.visible)) {
	   		window.minimize();
	   	} else {	
			window.activate(global.get_current_time());
		}
		if (Main.overview.visible) {
			Main.overview.hide();
		}
		if (!(window.is_on_all_workspaces())) {
			WM.get_workspace_by_index(ws_index).activate(global.get_current_time());
		}
    }
    
    // sort windows by creation date
    _sort_windows(window1, window2) {
    	return window1.get_id() - window2.get_id();
    }

    // activate workspace or show overview
    _toggle_ws(ws_index) {
		if (ws_index == WM.get_active_workspace_index()) {
			Main.overview.toggle();
		} else {
			WM.get_workspace_by_index(ws_index).activate(global.get_current_time());
		}
    }
});

class Extension {
    constructor() {
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

    enable() {
    	// hide Activities button
    	this._show_activities(false);
    	
    	// hide AppMenu
    	if (HIDE_APP_MENU) {
			AppMenu.container.hide();
		}
		
		// display app grid
		if (DISPLAY_APP_GRID) {
			this.app_grid = new AppGridButton();
			Main.panel.addToStatusArea('babar-app-grid-button', this.app_grid, 0, 'left');
		}
		
		// display favorites
		if (DISPLAY_FAVORITES) {
			this.favorites_menu = new FavoritesMenu();
			Main.panel.addToStatusArea('babar-favorites-menu', this.favorites_menu, 1, 'left');
		}
		
		// display tasks
		if (DISPLAY_TASKS) {
			this.workspaces_bar = new WorkspacesBar();
			Main.panel.addToStatusArea('babar-workspaces-bar', this.workspaces_bar, 2, 'left');
		}
    }

    disable() {
    	if (this.app_grid) {
    		this.app_grid.destroy();
    	}
    	
    	if (this.favorites_menu) {
    		this.favorites_menu._destroy();
    	}
    	
    	if (this.workspaces_bar) {
    		this.workspaces_bar._destroy();
    	}
    	
    	// restore Activities button
    	this._show_activities(true);
    	
    	// restore AppMenu icon
    	if (!Main.overview.visible && !Main.sessionMode.isLocked) {
			AppMenu.container.show();
		}
		
    }
}

function init() {
	return new Extension();
}

