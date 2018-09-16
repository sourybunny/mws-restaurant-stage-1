const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const cssMin = require('gulp-css');
const autoprefixer = require('gulp-autoprefixer');
const webp = require('gulp-webp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const htmlMin = require('gulp-htmlmin');
const log = require('gulplog');
const browserSync = require('browser-sync').create();
const reload = browserSync.reload;

// @ToDo-minifyjs
gulp.task('scripts', function () {
  return gulp.src('js/**/*.js')
    .pipe(gulp.dest('dist/js'));
});

// Copy manifest to dist
gulp.task('manifest', function () {
  return gulp.src('manifest.json')
    .pipe(gulp.dest('dist/'));
});

// copy sw to dist
gulp.task('sw', function () {
  return gulp.src('sw.js')
    .pipe(gulp.dest('dist/'));
});

// minify html
gulp.task('html', function() {
  gulp.src('*.html')
    .pipe(htmlMin({
      collapseWhitespace: true,
      removeOptionalTags: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      useShortDoctype: true
    }))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
});

// minify css
gulp.task('minifyCSS', ()=> {
  return gulp.src('css/**/*.css')
      .pipe(autoprefixer({
        browsers: ['last 2 versions']
      }))
      .pipe(cssMin())
      .pipe(concat('app.min.css'))
      .pipe(gulp.dest('dist/css'))
      .pipe(browserSync.stream());
})

// optimize images
gulp.task('images', function() {

// generate webp images
  gulp.src('img/**/*.jpg')
    .pipe(webp())
    .pipe(gulp.dest('dist/img/webp'));
// copy original images
  gulp.src('img/**/*')
    .pipe(gulp.dest('dist/img'));

});

gulp.task('run', ['minifyCSS', 'images','html','manifest','sw','scripts']);

// watch and serve
gulp.task('watch',()=> {
  browserSync.init({
    server: {
      baseDir: "./"

    }
  })
  gulp.watch('js/**/*.js', ['scripts']);
  gulp.watch('js/**/*.js').on('change', reload)
  gulp.watch('css/**/*.css', ['minifyCSS']);
  gulp.watch('js/**/*.css').on('change', reload)
  gulp.watch('*.html', ['html']);

  browserSync.stream();
})

gulp.task('default', ['run','watch']);
