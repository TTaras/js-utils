/*
 * gulp watch - выполнение задачи в зависимости от измененного файла css/js
 * gulp build - пересобрать все
 * gulp eslint - проверка js синтаксиса
 * gulp eslint-fn - проверка js синтаксиса только динамических модулей
 * gulp styles - сборка всего css
 * gulp styles-pages - сборка css только отдельных страниц
 * gulp styles-fn - сборка css только динамических модулей
 * gulp scripts - сборка всего js
 * gulp scripts-base - сборка js ядра, страниц и виджетов
 * gulp scripts-fn - сборка js только динамических модулей
 */
module.exports = {
    basePaths: {
        scripts: {
            src: 'public/static/scripts',
            dst: 'public/static/scripts/build',
            common: 'common/public/static/scripts',
            html: {
                common: 'common/views/public',
                project: 'app/views/public'
            }
        },
        styles: {
            src: 'public/static/styles',
            dst: 'public/static/styles/build',
            common: 'common/public/static/styles'
        }
    },
    baseTasks: {
        'eslint': {
            enable: true,
            buildProject: true
        },
        'eslint-fn': {
            enable: true
        },
        'scripts-base': {
            enable: true,
            files: ['main.js']
        },
        'scripts-fn': {
            enable: true
        },
        'styles-base': {
            enable: true,
            buildCommon: true,
            buildProject: false,
            includeReset: false
            //renameMain: 'common',
            //files: [{
            //    filename: 'print',
            //    sources: ['@common/print.less']
            //}]
        },
        'styles-fn': {
            enable: true,
            buildCommon: false
        },
        'styles-pages': {
            enable: true,
            buildCommon: false
        },
        'styles': {
            enable: true,
            tasks: ['styles-base', 'styles-fn', 'styles-pages']
        },
        'scripts': {
            enable: true,
            tasks: ['scripts-base', 'scripts-fn']
        },
        'build': {
            enable: true,
            tasks: ['styles', 'scripts']
        },
        'watch': {
            enable: true,
            tasks: ['styles', 'scripts']
        },
        'update': {
            enable: true
        },
        'clean': {
            enable: true
        }
    }
};