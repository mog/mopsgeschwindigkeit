//builds sass files with optimization

let gulp = require('gulp'),

    sass = require('gulp-sass'),
    importer = require('node-sass-json-importer'),
    critical = require('critical').stream,

    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    cssnano = require('cssnano'),
    mqpacker = require("css-mqpacker"),
    uncss = require("postcss-uncss"),
    htmlmin = require('gulp-htmlmin');
//uncss = require("uncss"),

gulp.task('sass', function () {
    var postCSSOptions = [
        autoprefixer({browsers: ['last 1 version']}),
        cssnano(),
        mqpacker()
        /*
        , uncss({
            html: [(paths.public + '*.html')],
            ignore: [new RegExp('^.register.*'), new RegExp('^.impression.*')]
        })*/
    ];

    return gulp.src('./src/sass/*.scss')
        .pipe(sass({
            includePaths: ['./src/sass/'],
            outputStyle: 'compressed',
            importer: importer
        }))
        .on('error', sass.logError)
        .pipe(postcss(postCSSOptions))
        .pipe(gulp.dest('./public/css/'))
});

// Generate & Inline Critical-path CSS
gulp.task('critical', ['pug', 'sass'], function () {
    return gulp.src('./public/*.html')
        .pipe(critical({
            base: './public/',
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
        .pipe(gulp.dest('./public/'));
});
