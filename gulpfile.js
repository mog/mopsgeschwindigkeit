/*global require*/
"use strict";

var gulp = require('gulp'),
    path = require('path'),
    data = require('gulp-data'),
    pug = require('gulp-pug'),
    prefix = require('gulp-autoprefixer'),
    sass = require('gulp-sass'),
    browserSync = require('browser-sync'),
    watch = require('gulp-watch'),

    //TODO pug has a bug where append/prepend will add lines multiple times in the include, and on the block
    //this task removes duplicates and only keeps the last - works on <script> and <link> only
    replace = require('gulp-remove-duplicates');

/*
 * Directories here
 */
var paths = {
    public: './public/',
    sass: './src/sass/',
    css: './public/css/',
    data: './src/_data/',
    assets: './src/_assets/',
    pubAssets: './public/assets/'
};

/**
 * Compile .pug files and pass in data from json file
 * matching file name. index.pug - index.pug.json
 */
gulp.task('pug', function () {
    return gulp.src('./src/*.pug')
        .pipe(data(function (file) {
            return require(paths.data + path.basename(file.path) + '.json');
        }))
        .pipe(pug())
        .on('error', function (err) {
            process.stderr.write(err.message + '\n');
            this.emit('end');
        })
        .pipe(replace({keepLast:true}))
        .pipe(gulp.dest(paths.public));
});

/**
 * Recompile .pug files and live reload the browser
 */
gulp.task('rebuild', ['pug'], function () {
    browserSync.reload();
});

/**
 * Wait for pug and sass tasks, then launch the browser-sync Server
 */
gulp.task('browser-sync', ['sass', 'pug'], function () {
    browserSync({
        server: {
            baseDir: paths.public
        },
        notify: false
    });
});

/**
 * Compile .scss files into public css directory With autoprefixer no
 * need for vendor prefixes then live reload the browser.
 */
gulp.task('sass', function () {
    return gulp.src(paths.sass + '*.scss')
        .pipe(sass({
            includePaths: [paths.sass],
            outputStyle: 'compressed'
        }))
        .on('error', sass.logError)
        .pipe(prefix(['last 2 versions'], {
            cascade: true
        }))
        .pipe(gulp.dest(paths.css))
        .pipe(browserSync.reload({
            stream: true
        }));
});

/**
 * Watch scss files for changes & recompile
 * Watch .pug files run pug-rebuild then reload BrowserSync
 */
gulp.task('watch', function () {
    gulp.watch(paths.sass + '**/*.scss', ['sass']);
    gulp.watch('./src/**/*.pug', ['rebuild']);
    gulp.watch(paths.assets + '**/*', ['copyassets']);
});

gulp.task('copyassets', function() {
    gulp.src(paths.assets +'**/*')
    .pipe(gulp.dest(path.pubAssets));
});

// Build task compile sass and pug.
gulp.task('build', ['sass', 'pug', "copyassets"]);

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync then watch
 * files for changes
 */
gulp.task('default', ['browser-sync', 'watch']);
