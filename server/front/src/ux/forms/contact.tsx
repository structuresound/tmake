import * as React from 'react';
import { combineReducers } from 'redux';
import { connect } from 'react-redux';
import { Field, Form, SubmissionError, reduxForm } from 'redux-form';
import { Grid, Row, Col, Button, FormGroup, FormControl, ControlLabel, HelpBlock } from 'react-bootstrap';
import { post, settings } from '../../lib';
import { FormField } from './formField';
import { Default as Layout, Spinner, gradients, aligner } from '../lib';


import { Document as ContactForm, validate, warn } from '../../schema/contactForm';

const emailStyle = { textAlign: 'center' };

const ContactFormClass = (props: ReduxFormProps) => {
    const { title } = settings.i18n;
    const { handleSubmit, pristine, reset, submitting, submitSucceeded, submitFailed, error } = props;
    if (submitSucceeded) {
        return (<p style={emailStyle}> Thank you! We'll be in touch</p>)
    } else if (submitFailed && !error) {
        return (<p style={emailStyle}> Sorry, something went wront. Please try again in a few hours.</p>)
    }
    return (
        <form onSubmit={handleSubmit}>
            <Field component={FormField} name="name" placeholder="First Last" type="text"> Name </Field>
            <Field component={FormField} name="email" placeholder="name@gmail.com" type="email"> Email </Field>
            <Field component={FormField} name="body" placeholder={`I have a question about ${title}`} type="text-box"> Your Message </Field>
            <Button type="submit" disabled={submitting || pristine} className="btn btn-info pull-right btn-chroma btn-md sm-fit">Submit</Button>
        </form >
    )
}

function onSubmit(form: ContactForm, dispatch: Function, context: any) {
    console.log('submit contact form');
    return post({ url: '/api/v1/contact', body: form }).then(
        (res: any) => {
            if (res.status == 201) {
                return dispatch(succeed(form, res));
            } else {
                return Promise.reject(new SubmissionError({
                    serverError: `unexpected success code: ${res.status}`
                } as any))
            }
        },
        (error: Error) => Promise.reject(new SubmissionError({
            serverError: error.message
        } as any))
    );
}

function succeed(form: ContactForm, res: any) {
    return {
        type: 'SUCCEED',
        res
    };
}

function fail(form: ContactForm, error: Error) {
    return {
        type: 'NETWORK_ERROR',
        error
    };
}

export const ReduxForm = reduxForm({
    form: 'contactForm',  // a unique identifier for this form
    validate,                // <--- validation function given to redux-form
    warn,                     // <--- warning function given to redux-form
    onSubmit
})(ContactFormClass as any)