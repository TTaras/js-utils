'use strict';

const gulpTasks = require('./gulp-tasks');

gulpTasks.create({
    baseTasks: {
        'scripts-base': {
            files: ['core.js', 'common.js', 'main.js']
        },
        'styles-base': {
            renameMain: 'common',
            files: [{
                filename: 'print',
                sources: ['@common/print.less']
            }]
        },
        'styles-pages': {
            buildCommon: true
        },
        'styles-fn': {
            buildCommon: true
        }
    }
});