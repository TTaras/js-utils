/* eslint-env node */
'use strict';

module.exports = {
    create: function(taskName, basePaths, config, gulp, seriaName) {
        var tasks = [];

        if (seriaName) {
            taskName = taskName + '-' + seriaName;
        }

        if (config.tasks && config.tasks.length) {
            tasks = config.tasks;
        }

        gulp.task(taskName, gulp.parallel(tasks));
    }
};
