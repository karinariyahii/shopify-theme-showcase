const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const imagemin = require('gulp-imagemin');
const sourcemaps = require('gulp-sourcemaps');
const gulpif = require('gulp-if');
const argv = require('yargs').argv;
const uglify = require('gulp-uglify');
const browserify = require('browserify');
const tap = require('gulp-tap');
const buffer = require('gulp-buffer');
const cache = require('gulp-cached');

const path = {
	fonts: {
		src: './src/fonts/**/*.*',
		watch: './src/fonts/**/*.*'
	},
	images: {
		src: './src/images/**/*.*',
		watch: './src/images/**/*.*'
	},
	scripts: {
		src: './src/*.js',
		watch: './src/**/*.js'
	},
	styles: {
		src: './src/*.{css,scss,sass}',
		watch: './src/**/*.{css,scss,sass}'
	},
	dist: '../assets/'
};

/* ---------------------- Build tasks ----------------------*/

gulp.task('build:fonts', () => {
	return gulp.src(path.fonts.src)
		.pipe(cache('fonts'))
		.pipe(gulp.dest(path.dist));
});

gulp.task('build:styles', () => {
	return gulp.src(path.styles.src)
		.pipe(cache('styles'))
		.pipe(gulpif(!argv.prod, sourcemaps.init()))
		.pipe(
			sass({
				includePaths: ['./node_modules'],
				errLogToConsole: true,
				outputStyle: gulpif(!argv.prod, 'expanded', 'compressed')
			})
		).on('error', sass.logError)
		.pipe(gulpif(argv.prod, autoprefixer('last 2 versions')))
		.pipe(gulpif(!argv.prod, sourcemaps.write()))
		.pipe(gulp.dest(path.dist));
});

gulp.task('build:scripts', () => {
	return gulp.src(path.scripts.src)
		.pipe(cache('scripts'))
		.pipe(tap(function (file) {
			file.contents = browserify(file.path, { debug: true }).bundle();
		}))
		.pipe(buffer())
		.pipe(gulpif(!argv.prod, sourcemaps.init({ loadMaps: true })))
		.pipe(
			babel({
				presets: ['@babel/env']
			})
		)
		.pipe(uglify())
		.pipe(gulpif(!argv.prod, sourcemaps.write()))
		.pipe(gulp.dest(path.dist));
});

gulp.task('build:images', () => {
	return gulp.src(path.images.src)
		.pipe(cache('images'))
		.pipe(gulpif(argv.prod,
			imagemin([
				imagemin.gifsicle({ interlaced: true }),
				imagemin.mozjpeg({ progressive: true }),
				imagemin.optipng({ optimizationLevel: 3 }),
				imagemin.svgo({
					plugins: [{ removeViewBox: false }, { cleanupIDs: false }]
				})
			])
		))
		.pipe(gulp.dest(path.dist));
});


/* ---------------------- Watch tasks ----------------------*/

gulp.task('watch:fonts', () => {
	gulp.watch(path.fonts.watch, gulp.series('build:fonts'));
});

gulp.task('watch:images', () => {
	gulp.watch(path.images.watch, gulp.series('build:images'));
});

gulp.task('watch:scripts', () => {
	gulp.watch(path.scripts.watch, gulp.series('build:scripts'));
});

gulp.task('watch:styles', () => {
	gulp.watch(path.styles.watch, gulp.series('build:styles'));
});

gulp.task('watch',
	gulp.parallel(
		'watch:fonts',
		'watch:images',
		'watch:scripts',
		'watch:styles'
	)
);


/* ---------------------- Main tasks ----------------------*/

gulp.task('build',
	gulp.parallel(
		'build:fonts',
		'build:styles',
		'build:scripts',
		'build:images'
	)
);

gulp.task('default',
	gulp.series(
		'build',
		'watch'
	)
);
