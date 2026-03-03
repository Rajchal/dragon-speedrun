const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
    const wsUrl = process.env.WS_URL || "ws://155.248.241.165:8080";
    const iconPath = path.join(__dirname, "sprites", "icon.png");
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        fullscreen: true,
        icon: iconPath,
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
    });

    win.once("ready-to-show", () => {
        win.setFullScreen(true);
        win.show();
    });

    win.setMenuBarVisibility(false);
    win.removeMenu();

    win.loadFile(path.join(__dirname, "index.html"), { query: { ws: wsUrl } });
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
