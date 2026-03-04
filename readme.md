# Development
Gulp processes source files from `dev/src` to `assets` folder.

### Before you start
1. Make sure you've installed Nodejs.
2. Upload the `dev` folder right to the root of your theme.
3. Run `npm install` from the `dev` folder.

### Sync with remote
* You can use it with both ThemeKit and ShopifyCLI. 
* Configuration file for ThemeKit is not provided, you'll need to take care of the sync process on your own.

### Build source files
* Run one of the following command from the `dev` folder:
    * `npm run dev` - watching and compiling the source files for development.
    * `npm run build` - compiling the source files for production.