import * as React from 'react';
import { combineReducers } from 'redux';
import { connect } from 'react-redux';
import { Field, Form, SubmissionError, reduxForm } from 'redux-form';
import { Grid, Row, Col, Button, FormGroup, FormControl, ControlLabel, HelpBlock } from 'react-bootstrap';
import { post } from '../../lib/fetch';
import { Document as SubscribeForm, validate, warn } from '../../schema/subscribeForm';
import { Spinner, gradients, aligner } from '../lib';

import { FormField } from './formField';

const emailStyle = { textAlign: 'center' };

const SubscribeFormClass = (props: ReduxFormProps) => {
    const { handleSubmit, pristine, reset, submitting, submitSucceeded, submitFailed } = props;
    if (submitSucceeded) {
        return (<p style={emailStyle}> Thank you! We'll be in touch</p>)
    } else if (submitFailed) {
        return (<p style={emailStyle}> Sorry, something went wront. Please try again in a few hours.</p>)
    }
    return (
        <form onSubmit={handleSubmit}>
            <Field component={FormField} name="name" placeholder="First Last" type="text"> Name </Field>
            <Field component={FormField} name="email" placeholder="investor@gmail.com" type="email"> Email </Field>
            <Button type="submit" disabled={submitting} className="btn btn-info pull-right btn-chroma btn-md sm-fit">Sign up</Button>
        </form >
    )
}

function succeed(form: SubscribeForm, res: any) {
    return {
        type: 'SUCCEED',
        res
    };
}

function fail(form: SubscribeForm, error: Error) {
    return {
        type: 'ERROR',
        error
    };
}

function onSubmit(form: SubscribeForm, dispatch: Function, context: any) {
    return post({ url: '/api/v1/subscribe', body: form }).then(
        (res: any) => {
            if (res.status == 201) {
                return dispatch(succeed(form, res));
            } else {
                return Promise.reject(new SubmissionError({
                    message: res.message,
                    serverError: `unexpected success code: ${res.status}`
                } as any))
            }
        },
        (error: Error) => Promise.reject(new SubmissionError({
            serverError: error.message
        } as any))
    );
}

export const ReduxForm = reduxForm({
    form: 'subscribeForm',  // a unique identifier for this form
    validate,                // <--- validation function given to redux-form
    warn,                     // <--- warning function given to redux-form
    onSubmit
})(SubscribeFormClass as any)

/* to connect additional combineReducers */

/*
const LOAD = 'redux-form/contact/LOAD'
const reducer = (state = {}, action: any) => {
    switch (action.type) {
        case LOAD:
            return {
                data: action.data
            }
        default:
            return state
    }
}
const loader = (data: any) => ({ type: LOAD, data });

// You have to connect() to any reducers that you wish to connect to yourself
connect(
    state => ({
        name: state.name,
        emails: state.emails
    }),
    { load: loader }               // bind account loading action creator
)(SubscribeForm as any);
*/