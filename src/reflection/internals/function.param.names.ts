// Shameless copy from angularjs
// https://github.com/angular/angular.js/blob/master/src/auto/injector.js
const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
const FN_ARG_SPLIT = /,/;
const FN_ARG = /^\s*(_?)(.+?)\1\s*$/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
export function getMethodParameterNames(fn: any): any[] {
  let scannedParameters: any[];
  let fnText;
  let argDecl;
  let last;

  if (typeof fn === 'function' && fn.length) {
    if (!(scannedParameters = fn.scannedParameters)) {
      scannedParameters = [];
      fnText = 'function ' + fn.toString().replace(STRIP_COMMENTS, '');
      argDecl = fnText.match(FN_ARGS);
      argDecl[1].split(FN_ARG_SPLIT).forEach(function(arg) {
        arg.replace(FN_ARG, (all: any, underscore: any, name: string): string => {
          scannedParameters.push(name);
          return '';
        });
      });
      fn.scannedParameters = scannedParameters;
    }
  } else if (Array.isArray(fn)) {
    last = fn.length - 1;
    scannedParameters = fn.slice(0, last);
  }
  return scannedParameters || [];
}
