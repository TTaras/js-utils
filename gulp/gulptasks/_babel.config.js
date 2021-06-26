const presets = [
    "@babel/preset-env",
    "@babel/preset-react"
];

const plugins = [
    "@babel/plugin-proposal-class-properties"
];

const extensions = ['.jsx']

/*if (process.env["ENV"] === "production") {
    plugins.push(...);
}*/

module.exports = {presets, plugins, extensions};