/* eslint-env node */
'use strict';

module.exports = {
    create: function(taskName, basePaths, config, gulp, seriaName) {
        let tasks = [];

        if (seriaName) {
            if (seriaName === 'application') {
                taskName = 'application';
            } else {
                taskName += '-' + seriaName;
            }
        }

        if (config.tasks && config.tasks.length) {
            tasks = config.tasks;
        }

        gulp.task(taskName, gulp.parallel(tasks));
    }
};