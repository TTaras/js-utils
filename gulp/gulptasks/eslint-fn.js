/* eslint-env node */
'use strict';

const _ = require('lodash');
const through2 = require('through2').obj;
const combine = require('stream-combiner2').obj;
const fs = require('fs');
const eslint = require('gulp-eslint');
const gulpIf = require('gulp-if');

module.exports = {
    create: function(taskName, basePaths, config, gulp, seriaName) {
        let paths;
        let src;

        if (seriaName) {
            taskName = taskName + '-' + seriaName;
        }

        if (config.paths) {
            paths = _.merge({}, basePaths.scripts, config.paths);
        } else {
            paths = basePaths.scripts;
        }

        src = [
            paths.src + '/fn/**/*.{js,jsx}'
        ];

        gulp.task(taskName, function(done) {
            let eslintResults = {};
            const cachePath = process.cwd() + '/tmp';
            const cacheFilePath = cachePath + '/lintCache.json';

            if (src.length === 0) {
                done();
                return false;
            }

            if (!fs.existsSync(cachePath)){
                fs.mkdirSync(cachePath);
            }

            try {
                eslintResults = JSON.parse(fs.readFileSync(cacheFilePath));
            } catch (e) {//
            }

            return gulp.src(src, {read: false})
                .pipe(gulpIf(
                    function(file) {
                        return eslintResults[file.path] && eslintResults[file.path].mtime === file.stat.mtime.toJSON();
                    },
                    through2(function(file, enc, callback) {
                        file.eslint = eslintResults[file.path].eslint;
                        callback(null, file);
                    }),
                    combine(
                        through2(function(file, enc, callback) {
                            file.contents = fs.readFileSync(file.path);
                            callback(null, file);
                        }),
                        eslint(),
                        through2(function(file, enc, callback) {
                            eslintResults[file.path] = {
                                eslint: file.eslint,
                                mtime: file.stat.mtime
                            };
                            callback(null, file);
                        })
                    )
                ))
                .on('end', function() {
                    if (!fs.existsSync(cachePath)) {
                        fs.mkdir(cachePath);
                    }
                    fs.writeFileSync(cacheFilePath, JSON.stringify((eslintResults)));
                })
                .pipe(eslint.format());
        });
    }
};
