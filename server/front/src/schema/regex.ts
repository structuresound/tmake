const regex = {
    fullName: /^([a-zA-Z]{2,}\s[a-zA-z]{1,}'?-?[a-zA-Z]{2,}\s?([a-zA-Z]{1,})?)/,
    // We use the RegExp suggested by W3C in http://www.w3.org/TR/html5/forms.html#valid-e-mail-address
    // This is probably the same logic used by most browsers when type=email, which is our goal. It is
    // a very permissive expression. Some apps may wish to be more strict and can write their own RegExp.
    // Email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    // URL RegEx from https://gist.github.com/dperini/729294
    // http://mathiasbynens.be/demo/url-regex
    url: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i,
    // unique id from the random package also used by minimongo
    // character list: https://github.com/meteor/meteor/blob/release/0.8.0/packages/random/random.js#L88
    // string length: https://github.com/meteor/meteor/blob/release/0.8.0/packages/random/random.js#L143
    mongoId: /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17}$/,
    // allows for a 5 digit zip code followed by a whitespace or dash and then 4 more digits
    // matches 11111 and 11111-1111 and 11111 1111
    zipCome: /^\d{5}(?:[-\s]\d{4})?$/,
    // taken from google's libphonenumber library
    // https://github.com/googlei18n/libphonenumber/blob/master/javascript/i18n/phonenumbers/phonenumberutil.js
    // reference the VALID_PHONE_NUMBER_PATTERN key
    // allows for common phone number symbols including + () and -
    phone: /^[0-9０-９٠-٩۰-۹]{2}$|^[+＋]*(?:[-x‐-―−ー－-／  ­​⁠　()（）［］.\[\]/~⁓∼～*]*[0-9０-９٠-٩۰-۹]){3,}[-x‐-―−ー－-／  ­​⁠　()（）［］.\[\]/~⁓∼～0-9０-９٠-٩۰-۹]*(?:;ext=([0-9０-９٠-٩۰-۹]{1,7})|[  \t,]*(?:e?xt(?:ensi(?:ó?|ó))?n?|ｅ?ｘｔｎ?|[,xｘ#＃~～]|int|anexo|ｉｎｔ)[:\.．]?[  \t,-]*([0-9０-９٠-٩۰-۹]{1,7})#?|[- ]+([0-9０-９٠-٩۰-۹]{1,5})#)?$/i,
    pubkey: /^[13n][1-9A-Za-z][^OIl]{20,40}/,
    privkey: /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/
};

export default regex;
