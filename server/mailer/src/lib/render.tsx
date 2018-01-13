import Oy from 'oy-vey';
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import { VerifyEmail, ResetPassword, NotFound, Contact } from '../emails';
import { generateCustomTemplate } from './template';
import { settings } from '../lib';

const components: { [index: string]: (props: any) => JSX.Element } = {
    verifyEmail: VerifyEmail,
    resetPassword: ResetPassword,
    contact: Contact
}

export function renderTemplate(template: string, props: any, options?: any) {
    const Component = components[template] || NotFound;
    return Oy.renderTemplate(<Component {...props} />, options, (templateOptions: any) => generateCustomTemplate(templateOptions));
}

export function render(template: TMake.Email): TMake.Email {
    const { title } = settings.i18n;
    return {
        from: template.from,
        to: template.to,
        subject: template.subject,
        replyTo: template.replyTo || template.from,
        html: renderTemplate(template.template, template.data, {
            title: title, previewText: template.subject
        }),
        generateTextFromHTML: true
    }
}