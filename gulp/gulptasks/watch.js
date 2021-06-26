/* eslint-env node */
'use strict';

const _ = require('lodash');

module.exports = {
    create: function(taskName, basePaths, config, gulp, seriaName) {
        let tasks = [];
        let paths;

        if (seriaName) {
            taskName += '-' + seriaName;
            seriaName = '-' + seriaName;
        } else {
            seriaName = '';
        }

        if (config.paths) {
            paths = _.merge({}, basePaths, config.paths);
        } else {
            paths = basePaths;
        }

        if (config.tasks && config.tasks.length) {
            for (let task of config.tasks) {
                tasks.push('watch:' + task);
                registeTask(task);
            }
        }

        function registeTask(nameSubTask) {
            if (nameSubTask.indexOf('styles') > -1) {
                gulp.task('watch:styles' + seriaName, function() {
                    gulp.watch(
                        [
                            paths.styles.src + '/**/main.less',
                            paths.styles.src + '/vendor/*/*.css'
                        ], gulp.series('styles' + seriaName))
                        .on('change', function(path) {
                            console.log('Changed file ' + path);
                        }).on('unlink', function(path) {
                            console.log('Delete file ' + path + '. Please launch watch again');
                        });
                });

            } else if (nameSubTask.indexOf('scripts') > -1) {
                gulp.task('watch:scripts' + seriaName, function() {
                    gulp.watch(
                        [
                            paths.scripts.src + '/**/*.{js,jsx}',
                            '!' + paths.scripts.src + '/**/_*.js'
                        ], gulp.series('scripts' + seriaName))
                        .on('change', function(path) {
                            console.log('Changed file ' + path);
                        }).on('unlink', function(path) {
                            console.log('Delete file ' + path + '. Please launch watch again');
                        });
                });
            }
        }

        gulp.task(taskName, gulp.parallel(tasks));
    }
};