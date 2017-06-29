interface FieldProps {
    name: string,
    inputProps?: {
        component: string
    }
    placeholder?: string
}

interface ReduxFormProps {
    onSubmit?: (values: any) => void;
    handleSubmit?: React.FormEventHandler<HTMLFormElement>,
    reset?: any;
    pristine?: boolean,
    submitting?: boolean,
    submitSucceeded?: boolean,
    submitFailed?: boolean
    error?: Error;
}