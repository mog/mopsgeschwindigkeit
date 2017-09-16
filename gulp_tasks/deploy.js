var gulp = require('gulp'),
    gulpSequence = require('gulp-sequence');

gulp.task('copy:trbl', function () {
    gulp.src('./public/**/*')
        .pipe(gulp.dest("P:/var/www/site/trbl/dline2017/"));
});

gulp.task('copy:deadline', function () {
    gulp.src('./public/**/*')
        .pipe(gulp.dest("L:/pubhtml"));
});

gulp.task('deploy:trbl', gulpSequence('build', 'copy:trbl'));
gulp.task('deploy:deadline', gulpSequence('build', 'copy:deadline'));