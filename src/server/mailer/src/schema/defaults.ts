import { settings } from '../lib';

export function propsForTemplate(template: string) {
    switch (template) {
        case 'verifyEmail':
            return <TMake.Email.Account.VerifyEmail>{
                profile: {
                    firstName: 'Alice',
                    lastName: 'Adminson'
                },
                validationLink: 'https://localhost.chroma.fund/verify'
            }
        default: return {};
    }
}

export function previewTextForTemplate(template: string) {
    const { title } = settings.i18n;
    switch (template) {
        case 'verifyEmail': return `please verify your ${title} account`
        case 'orderStatus': return `your ${title} order has been processed`
        default: return 'subject template';
    }
}

export function optionsForTemplate(template: string) {
    const { title } = settings.i18n;
    return {
        title: title,
        previewText: previewTextForTemplate(template)
    }
}