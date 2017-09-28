export class Document {
    name?: string
    email?: string
}

import regex from './regex';

export const validate = (doc: Document) => {
    const errors = <Document>{}
    if (!regex.fullName.test(doc.name)) {
        errors.name = 'First + Last Required'
    } else if (doc.name.length > 32) {
        errors.name = 'Must be 32 characters or less'
    }
    if (!doc.email) {
        errors.email = 'Required'
    } else if (!regex.email.test(doc.email)) {
        errors.email = 'Invalid email address'
    }
    return Object.keys(errors).length ? errors : undefined;
}

export const warn = (values: Document) => {
    const warnings = <Document>{}
    if (values.email && values.email.indexOf('.con') != -1) {
        warnings.email = 'whoops, check your .com address'
    }
    return Object.keys(warnings).length ? warnings : undefined;
}