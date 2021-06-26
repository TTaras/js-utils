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
            let sourceList = [];
            let stylesLength;
            let stylesCounter = 0;
            const defaultName = config.renameMain || 'main';

            if (Array.isArray(config.files)) {
                config.files.forEach(function(val, i, arr) {
                    if (Array.isArray(val.sources)) {
                        arr[i].sources.forEach(function(val, i, arr) {
                            arr[i] = arr[i].replace('@common', paths.common);
                            arr[i] = arr[i].replace('@app', paths.src);
                        }, arr[i]);
                    }
                });
            }

            if (config.buildCommon || config.buildProject) {
                let files = [
                    paths.common + '/paths.less',
                    paths.common + '/variables.less',
                    paths.common + '/mixins.less',
                    paths.common + '/blocks/mixins/**/main.less'
                ];

                if (config.buildProject) {
                    files = files.concat([
                        paths.src + '/paths.less'
                    ]);
                }

                if (config.buildCommon) {
                    files = files.concat([
                        paths.common + '/reset.less',
                        paths.common + '/globals.less',
                        paths.common + '/layout.less',
                        paths.common + '/blocks/**/*/main.less'
                    ]);
                }

                if (config.files && config.files.length) {
                    for (let data of config.files) {
                        if (data.filename === 'main') {
                            files = files.concat(data.sources);
                        }
                    }
                }

                if (config.buildProject) {
                    if (config.includeReset) {
                        files.push(paths.common + '/reset.less');
                    }

                    files = files.concat([
                        paths.src + '/variables.less',
                        paths.src + '/mixins.less',
                        paths.src + '/!(variables|mixins|print|dark)*.less',
                        paths.src + '/blocks/mixins/**/main.less',
                        paths.src + '/blocks/**/*/main.less'
                    ]);
                }

                sourceList = [{
                    filename: defaultName,
                    sources: files
                }];
            }

            if (config.files && config.files.length) {
                for (let data of config.files) {
                    if (data.filename === defaultName && !config.buildCommon && !config.buildProject) {
                        sourceList[0].sources = sourceList[0].sources.concat(data.sources);
                    } else if (data.filename !== defaultName){
                        sourceList.push(data);
                    }
                }
            }

            stylesLength = sourceList.length;

            if (stylesLength === 0) {
                done();
                return false;
            }

            const streams = sourceList.map(function(element) {
                return gulp.src(element.sources, {since: gulp.lastRun(taskName)})
                    .pipe(gulpIf(isDevelop, remember('styles' + element.filename)))
                    .pipe(concat({path: paths.src + '/' + '_concat_' + element.filename + '.less'}))
                    .pipe(less()
                        .on('error', function(error){
                            notify.onError({
                                title: 'Gulp',
                                subtitle: 'Failure!',
                                message: 'Error: <%= error.message %>'
                            })(error);
                            done(error.message);
                        }))
                    .pipe(gulpIf(!isDevelop, minifyCSS()))
                    .pipe(rename('_' + element.filename + '.css'))
                    .pipe(gulp.dest(paths.dst))
                    .on('end', function(){
                        if (++stylesCounter === stylesLength) {
                            done();
                        }
                    });
            });

            return eventStream.merge(streams);
        });
    }
};
