'use strict';

const _ = require('lodash');
const gulp = require('gulp');
const configMain = require('./gulp-config-main');

const tasks = {
    'eslint': require('./gulptasks/eslint'),
    'eslint-fn': require('./gulptasks/eslint-fn'),
    'scripts-base': require('./gulptasks/scripts-base'),
    'scripts-fn': require('./gulptasks/scripts-fn'),
    'styles-base': require('./gulptasks/styles-base'),
    'styles-fn': require('./gulptasks/styles-fn'),
    'styles-pages': require('./gulptasks/styles-pages'),
    'styles': require('./gulptasks/styles'),
    'scripts': require('./gulptasks/scripts'),
    'build': require('./gulptasks/build'),
    'watch': require('./gulptasks/watch'),
    'update': require('./gulptasks/update'),
    'clean': require('./gulptasks/clean'),
};

module.exports = {
    create: function(configLocal) {
        let config = _.merge({}, configMain, configLocal);

        if (config.baseTasks) {
            for (let taskName in config.baseTasks) {
                let taskConfig = config.baseTasks[taskName];

                if (taskConfig.enable) {
                    if (taskName.startsWith('scripts')) {
                        taskConfig.eslint = !!(config.baseTasks.eslint && config.baseTasks.eslint.enable);
                    }

                    if (tasks[taskName]) {
                        tasks[taskName].create(taskName, config.basePaths, taskConfig, gulp);
                    } else {
                        throw new Error('Undefined task - ' + taskName);
                    }
                }
            }
        }

        if (config.otherTasks) {
            for (let seriaName in config.otherTasks) {
                let seria = config.otherTasks[seriaName];

                for (let taskName in seria) {
                    let taskConfig = seria[taskName];

                    if (taskConfig.enable) {
                        if (taskName.startsWith('scripts')) {
                            taskConfig.eslint = !!(seria.eslint && seria.eslint.enable);
                        } else if (taskName.startsWith('styles') && seria['scripts-base'] && seria['scripts-base'].paths) {
                            taskConfig.scriptsPaths = seria['scripts-base'].paths;
                        }

                        if (tasks[taskName]) {
                            tasks[taskName].create(taskName, config.basePaths, taskConfig, gulp, seriaName);
                        } else {
                            throw new Error('Undefined task - ' + taskName);
                        }
                    }
                }
            }
        }
    }
}
