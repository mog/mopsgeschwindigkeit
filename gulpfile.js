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
    importer = require('node-sass-json-importer'),
    imagemin = require('gulp-imagemin'),
    gutil = require('gulp-util'),
    browserify = require('gulp-browserify'),
    through = require('through2'),
    uglify = require('uglify-es'),
    critical = require('critical').stream,
    htmlmin = require('gulp-htmlmin');

/*
 * Directories here
 */
var paths = {
    public: './public/',
    sass: './src/sass/',
    css: './public/css/',
    data: './src/_data/',
    assets: './src/_assets/',
    pubAssets: './public/assets/',
    scripts: './src/_scripts/',
    pubScripts: './public/js/'
};

/**
 * Uglify generated js
 */
gulp.task('uglify', ['browserify'], function () {
    return gulp.src(paths.pubScripts+'*.js')
        .pipe(
            through.obj((file,enc,cb) => {
                var minres = uglify.minify(file.contents.toString());
                if (minres.error) {
                    process.stderr.write(
                        minres.error.message +
                        ' in ' +
                        minres.error.filename +
                        ':' +
                        minres.error.line +
                        ' ' +
                        minres.error.col +
                        ':' +
                        minres.error.pos +
                        '\n'
                    );
                } else {
                    var olength = file.contents.byteLength;
                    file.contents = Buffer.from(minres.code);
                    gutil.log(
                        `Compressed ${file.path.split('/').pop()}`,
                        gutil.colors.gray(`(saved ${olength - file.contents.byteLength} bytes - ${(100-(file.contents.byteLength/olength)*100).toFixed(2)}%)`)
                    );
                }
                cb(null, file);
            })
        )
        .on('error', function (err) {
            process.stderr.write(err.message + '\n');
            this.emit('end');
        })
        .pipe(gulp.dest(paths.pubScripts));
});

/**
 * Compile page.js into public js file
 */
gulp.task('browserify', function () {
    return gulp.src(paths.scripts + '*.js')
        .pipe(browserify({
            bare: true
        }))
        .on('error', function (err) {
            process.stderr.write(err.message + '\n');
            this.emit('end');
        })
        .pipe(gulp.dest(paths.pubScripts));
});
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

        .pipe(gulp.dest(paths.public));
});

// Generate & Inline Critical-path CSS
gulp.task('critical', function () {
    return gulp.src(paths.public+'*.html')
        .pipe(critical({
            base: paths.public,
            inline: true,
            minify:true,
            extract: true
            //,css: [paths.public + 'css/style.css']
        }))
        .on('error', function(err) { gutil.log(gutil.colors.red(err.message)); })
        .pipe(htmlmin({
            collapseWhitespace: true,
            minifyCSS:true,
            minifyJS:true,
            sortAttributes:true,
            sortClassName:true
        }))
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
gulp.task('browser-sync', ['sass', 'browserify', 'pug', 'copyassets'], function () {
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
            outputStyle: 'compressed',
            importer: importer
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
    gulp.watch(paths.scripts + '**/*.js', ['browserify','uglify']);
    gulp.watch(['./src/**/*.pug', './src/**/*.json'], ['rebuild']);
    gulp.watch(paths.assets + '**/*', ['copyassets']);
});

gulp.task('copyassets', function() {
    gulp.src(paths.assets +'**/*')
        .pipe(imagemin())
        .pipe(gulp.dest(paths.pubAssets));
});

gulp.task('copymanifest', function() {
    gulp.src('./src/manifest.json')
        //.pipe(imagemin())
        .pipe(gulp.dest(paths.public));
});

// Build task compile sass and pug.
gulp.task('build', ['critical', 'sass', 'browserify', 'uglify', 'pug', 'copymanifest', 'copyassets']);

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync then watch
 * files for changes
 */
gulp.task('default', ['browser-sync', 'watch']);
