/* eslint-env node */
'use strict';

const del = require('del');

module.exports = {
    create: function(taskName, basePaths, config, gulp, seriaName) {
        if (seriaName) {
            taskName = taskName + '-' + seriaName;
        }

        let paths = [basePaths.scripts.dst + '/*', basePaths.styles.dst + '/*', 'tmp/*'];
        if (config.paths) {
            paths.push(config.paths + '/*');
        }

        gulp.task(taskName, () => del(paths));
    }
};