import { onPossiblyUnhandledRejection } from 'bluebird';
onPossiblyUnhandledRejection(function (error) { throw error; });

export function semverRegex() {
	return /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z\-]+(?:\.[\da-z\-]+)*)?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?\b/ig;
};