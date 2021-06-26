/* eslint-env node */
'use strict';

const _ = require('lodash');
const less = require('gulp-less');
const minifyCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const eventStream = require('event-stream');
const notify = require('gulp-notify');
const remember = require('gulp-remember');
const gulpIf = require('gulp-if');
const readPaths = require('./_read-paths');

const isDevelop = process.env.NODE_ENV && process.env.NODE_ENV === 'develop';

module.exports = {
    create: function(taskName, basePaths, config, gulp, seriaName) {
        let paths;

        if (seriaName) {
            taskName += '-' + seriaName;
        }

        if (config.paths) {
            paths = _.merge({}, basePaths.styles, config.paths);
        } else {
            paths = basePaths.styles;
        }

        gulp.task(taskName, function(done) {
            const sourceList = readPaths.readDir(paths.src + '/pages');
            const stylesLength = sourceList.length;
            let stylesCounter = 0;
            const bootstrap = [
                paths.common + '/paths.less',
                paths.common + '/variables.less',
                paths.common + '/mixins.less',
                paths.common + '/blocks/mixins/**/main.less'
            ];

            if (!config.buildCommon) {
                bootstrap.push(paths.src + '/paths.less');
                bootstrap.push(paths.src + '/variables.less');
                bootstrap.push(paths.src + '/mixins.less');
                bootstrap.push(paths.src + '/blocks/mixins/**/main.less');
            }

            if (stylesLength === 0) {
                done();
                return false;
            }

            const streams = sourceList.map(function(folder) {
                const filepath = paths.src + '/pages/' + folder;

                let list = bootstrap.slice();
                list.push(filepath + '/**/main.less');

                return gulp.src(list, {since: gulp.lastRun(taskName)})
                    .pipe(gulpIf(isDevelop, remember('styles_' + filepath)))
                    .pipe(concat({path: paths.src + '/' + '_concat_' + folder + '.less'}))
                    .pipe(less()
                        .on('error', function(error) {
                            notify.onError({
                                title: 'Gulp',
                                subtitle: 'Failure!',
                                message: 'Error: <%= error.message %>'
                            })(error);
                            done(error.message);
                        }))
                    .pipe(gulpIf(!isDevelop, minifyCSS()))
                    .pipe(rename('_' + folder + '.css'))
                    .pipe(gulp.dest(paths.dst + '/pages'))
                    .on('end', function() {
                        if (++stylesCounter === stylesLength) {
                            done();
                        }
                    });
            });

            return eventStream.merge(streams);
        });
    }
};
