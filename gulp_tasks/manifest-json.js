let gulp = require('gulp'),

    fs = require('fs'),
    rename = require("gulp-rename"),
    imageResize = require('gulp-image-resize'),
    imagemin = require('gulp-imagemin');

gulp.task('copymanifest', function () {
    gulp.src('./src/manifest.json')
        .pipe(gulp.dest('./public/'));
});

//get sizes from manifest, resize images
gulp.task('manifest', function () {
    let dataJSON = JSON.parse(fs.readFileSync('./src/manifest.json')),
        sizes = dataJSON.icons.map((icon) => {
            return parseInt(icon.sizes.split("x"), 10);
        });

    sizes.map((size) => {
        gulp.src('./src/_assets/**/*--logo--manifest.*')
            .pipe(imageResize({
                width: size,
                filter: 'catrom',
                upscale: false
            }))
            .pipe(rename(function (path) {
                path.basename += '_' + size;
            }))
            .pipe(imagemin())
            .pipe(gulp.dest('./public/assets/'));
    });
});