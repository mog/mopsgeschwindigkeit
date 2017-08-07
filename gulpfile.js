/*global require*/
"use strict";

var gulp = require('gulp'),
    path = require('path'),
    data = require('gulp-data'),
    pug = require('gulp-pug'),
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
    htmlmin = require('gulp-htmlmin'),

    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    cssnano = require('cssnano'),
    mqpacker = require("css-mqpacker"),
    uncss = require("postcss-uncss"),

    del = require('del'),

    gulpSequence = require('gulp-sequence'),
    imageResize = require('gulp-image-resize'),
    rename = require("gulp-rename");

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
gulp.task('critical', ['pug', 'sass'], function () {
    return gulp.src(paths.public + '*.html')
        .pipe(critical({
            base: paths.public,
            inline: true,
            minify: true,
            extract: true
        }))
        .on('error', function (err) {
            gutil.log(gutil.colors.red(err.message));
        })
        .pipe(htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            sortAttributes: true,
            sortClassName: true
        }))
        .pipe(gulp.dest(paths.public));
});

gulp.task('clean', function (cb) {
    return del([paths.public + '**/*.*'], cb);
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

gulp.task('sass', function () {
    var postCSSOptions = [
        autoprefixer({browsers: ['last 1 version']}),
        cssnano(),
        mqpacker()
        , uncss({
            html: [(paths.public + '*.html')],
            ignore: [new RegExp('^.register.*'), new RegExp('^.impression.*')]
        })
    ];

    return gulp.src(paths.sass + '*.scss')
        .pipe(sass({
            includePaths: [paths.sass],
            outputStyle: 'compressed',
            importer: importer
        }))
        .on('error', sass.logError)
        .pipe(postcss(postCSSOptions))
        .pipe(gulp.dest(paths.css))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('watch', function () {
    gulp.watch(paths.sass + '**/*.scss', ['sass']);
    gulp.watch(paths.scripts + '**/*.js', ['browserify', 'uglify']);
    gulp.watch(['./src/**/*.pug', './src/**/*.json'], ['rebuild']);
    gulp.watch(paths.assets + '**/*', ['copyassets']);
});

gulp.task('copyassets', function () {
    gulp.src([paths.assets + '**/*', '!'+paths.assets + '**/imp*.*', '!'+paths.assets + '**/sponsor_*.*'])
        .pipe(imagemin())
        .pipe(gulp.dest(paths.pubAssets));
});

gulp.task('manifest', function () {
    var dataJSON = JSON.parse(fs.readFileSync('./src/manifest.json')),
        sizes = dataJSON.icons.map((icon) => {
            return parseInt(icon.sizes.split("x"), 10);
        });

    sizes.map((size)=>{
        gulp.src(paths.assets + '**/*--logo--manifest.*')
        .pipe(imageResize({
            width : size,
            filter:'catrom',
            upscale : false
        }))
        .pipe(rename(function (path) { path.basename += '_'+ size; }))
        .pipe(imagemin())
        .pipe(gulp.dest(paths.pubAssets));
    });
});


gulp.task('impression', function () {
    var dataJSON = JSON.parse(fs.readFileSync('./src/_data/index.pug.json'));

    [].map((size)=>{
        gulp.src(paths.assets + '**/imp*.*')
        .pipe(imageResize({
            width : size.width,
            filter:'catrom',
            upscale : false
        }))
        .pipe(rename(function (path) { path.basename += size.suffix; }))
        .pipe(imagemin())
        .pipe(gulp.dest(paths.pubAssets));
    });
});

gulp.task('copymanifest', function () {
    gulp.src('./src/manifest.json')
        .pipe(gulp.dest(paths.public));
});

gulp.task('copy:trbl', function () {
    gulp.src(paths.public + '/**/*')
        .pipe(gulp.dest("P:/var/www/site/trbl/dline2017/"));
});

gulp.task('default', ['clean', 'browser-sync', 'watch']);

gulp.task('build', gulpSequence('clean', ['copymanifest', 'copyassets', 'impression'], ['pug', 'sass', 'browserify'], 'uglify', 'critical'));
gulp.task('deploy:trbl', gulpSequence('build', 'copy:trbl'));