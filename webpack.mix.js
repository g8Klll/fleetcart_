const glob = require("glob");
const mix = require("laravel-mix");
const execSync = require("child_process").execSync;

require("laravel-mix-merge-manifest");

// compile admin and theme assets
let configs = glob.sync(
    "{./Modules/*/webpack.mix.js,./Themes/*/webpack.mix.js}"
);

// compile admin assets only
// let configs = glob.sync("./Modules/*/webpack.mix.js");

// compile theme assets only
// let configs = glob.sync("./Themes/*/webpack.mix.js");

if (process.env.module !== undefined) {
    let module =
        process.env.module.charAt(0).toUpperCase() +
        process.env.module.slice(1);

    configs = [`./Modules/${module}/webpack.mix.js`];
}

if (process.env.theme !== undefined) {
    let theme =
        process.env.theme.charAt(0).toUpperCase() + process.env.theme.slice(1);

    configs = [`./Themes/${theme}/webpack.mix.js`];
}

mix.setPublicPath("./")
    .options({ processCssUrls: false })
    .sourceMaps(true, "eval-source-map")
    .mergeManifest();

let commands = [];

configs.forEach((config) => {
    require(config);

    let module = config.match(/Modules\/(\w+?)\//);
    let theme = config.match(/Themes\/(\w+?)\//);

    if (module !== null) {
        commands.push(`php artisan module:publish ${module[1]}`);
    }

    if (theme !== null) {
        commands.push(`php artisan stylist:publish ${theme[1]}`);
    }
});

mix.after(() => {
    commands.map((command) => {
        execSync(command);
    });
});
