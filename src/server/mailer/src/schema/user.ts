import { prune } from 'typed-json-transform';
import regex from './regex';

export const validate = (props: TMake.Email.Account.VerifyEmail) => {
    const errors: TMake.Email.Account.VerifyEmail = { profile: {}, validationLink: '' };
    if (!regex.fullName.test(props.profile.firstName + props.profile.lastName)) {
        errors.profile.firstName = 'First + Last Required'
    }
    prune(errors);
    return Object.keys(errors).length ? errors : undefined;
}