let gulp = require('gulp'),

    browserSync = require('browser-sync');

gulp.task('rebuild', ['pug'], function () {
    browserSync.reload();
});

gulp.task('browser-sync', ['copyassets', 'impression', 'sponsors', 'manifest', 'pug', 'sass', 'browserify'], function () {
    browserSync({
        server: {
            baseDir: './public/'
        },
        notify: false
    });
});

gulp.task('watch', function () {
    gulp.watch('./src/sass/**/*.scss', ['sass']);
    gulp.watch('./src/scripts/**/*.js', ['browserify', 'uglify']);
    gulp.watch(['./src/**/*.pug', './src/**/*.json'], ['rebuild']);
    gulp.watch('./src/_assets/**/*', ['copyassets']);
});
