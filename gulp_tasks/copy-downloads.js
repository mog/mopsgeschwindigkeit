let gulp = require('gulp');

gulp.task('copydownloads', function () {
    gulp.src(['./src/download/**/*'])
        .pipe(gulp.dest('./public/download/'));
});
